import { Router, Request, Response } from 'express'
import multer from 'multer'
import { z } from 'zod'
import * as path from 'path'
import * as fs from 'fs'
import { UploadThumbnailUseCase } from '../../../application/use-cases/media/UploadThumbnailUseCase'
import { UploadFullMediaUseCase } from '../../../application/use-cases/media/UploadFullMediaUseCase'
import { GetGalleryUseCase } from '../../../application/use-cases/media/GetGalleryUseCase'
import { requireAuth, requireDeviceAuth } from '../middleware/authMiddleware'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB máximo
})

const MEDIA_DIR = process.env.MEDIA_DIR ?? '/app/media'

const galleryQuerySchema = z.object({
  deviceId: z.string().uuid(),
  fileType: z.enum(['photo', 'video']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

export function createMediaRoutes(
  uploadThumbnailUseCase: UploadThumbnailUseCase,
  uploadFullMediaUseCase: UploadFullMediaUseCase,
  getGalleryUseCase: GetGalleryUseCase,
): Router {
  const router = Router()

  // POST /media/thumbnail — dispositivo hijo sube miniatura inmediata (por datos móviles)
  router.post('/thumbnail', requireDeviceAuth, upload.single('file'), async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: 'Archivo requerido' })
      return
    }

    const fileType = (req.body.fileType === 'video') ? 'video' : 'photo'
    const takenAt = req.body.takenAt ? parseInt(req.body.takenAt, 10) : null

    const result = await uploadThumbnailUseCase.execute({
      deviceId: req.deviceId!,
      fileType,
      takenAt,
      thumbnailBuffer: req.file.buffer,
      originalFilename: req.file.originalname,
    })

    if (!result.ok) {
      res.status(500).json({ error: result.error.message })
      return
    }

    res.status(201).json({ ok: true, mediaId: result.value.id })
  })

  // POST /media/upload/:mediaId — dispositivo hijo sube archivo completo (solo WiFi)
  router.post('/upload/:mediaId', requireDeviceAuth, upload.single('file'), async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: 'Archivo requerido' })
      return
    }

    const result = await uploadFullMediaUseCase.execute({
      mediaId: req.params.mediaId,
      deviceId: req.deviceId!,
      fileBuffer: req.file.buffer,
      filename: req.file.originalname,
      fileSizeBytes: req.file.size,
    })

    if (!result.ok) {
      const status = result.error.name === 'NotFoundError' ? 404 : 500
      res.status(status).json({ error: result.error.message })
      return
    }

    res.json({ ok: true })
  })

  // GET /media — padre obtiene galería paginada
  router.get('/', requireAuth, async (req: Request, res: Response) => {
    const parsed = galleryQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message })
      return
    }

    const result = await getGalleryUseCase.execute({
      deviceId: parsed.data.deviceId,
      fileType: parsed.data.fileType,
      from: parsed.data.from ? new Date(parsed.data.from) : undefined,
      to: parsed.data.to ? new Date(parsed.data.to) : undefined,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    })

    if (!result.ok) {
      res.status(500).json({ error: result.error.message })
      return
    }

    // Transformar rutas de archivo a URLs servibles
    const items = result.value.map((m) => ({
      id: m.id,
      deviceId: m.deviceId,
      fileType: m.fileType,
      thumbnailUrl: m.thumbnailPath ? `/media/file/${m.thumbnailPath}` : null,
      fullUrl: m.fullUploaded ? `/media/file/${m.filePath}` : null,
      thumbnailReady: m.thumbnailUploaded,
      fullReady: m.fullUploaded,
      fileSizeBytes: m.fileSizeBytes,
      takenAt: m.takenAt,
      createdAt: m.createdAt,
    }))

    res.json({ media: items })
  })

  // GET /media/file/* — servir archivos de media (miniatura o completo)
  router.get('/file/*', requireAuth, (req: Request, res: Response) => {
    const relativePath = (req.params as Record<string, string>)[0]
    if (!relativePath) {
      res.status(400).json({ error: 'Ruta requerida' })
      return
    }

    // Sanitizar: no permitir path traversal
    const safePath = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '')
    const absolutePath = path.join(MEDIA_DIR, safePath)

    if (!absolutePath.startsWith(MEDIA_DIR)) {
      res.status(403).json({ error: 'Acceso denegado' })
      return
    }

    if (!fs.existsSync(absolutePath)) {
      res.status(404).json({ error: 'Archivo no encontrado' })
      return
    }

    res.sendFile(absolutePath)
  })

  return router
}
