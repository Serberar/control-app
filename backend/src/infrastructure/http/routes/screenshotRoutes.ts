import { Router, Request, Response } from 'express'
import multer from 'multer'
import { ScreenshotUseCase } from '../../../application/use-cases/screenshot/ScreenshotUseCase'
import { requireAuth, requireDeviceAuth } from '../middleware/authMiddleware'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB máximo por captura
})

export function createScreenshotRoutes(screenshotUseCase: ScreenshotUseCase): Router {
  const router = Router()

  // POST /api/screenshots/upload — hijo sube una captura de pantalla
  router.post('/upload', requireDeviceAuth, upload.single('file'), async (req: Request, res: Response) => {
    const deviceId = req.body.deviceId as string
    if (!deviceId || !req.file) {
      res.status(400).json({ error: 'deviceId y archivo requeridos' })
      return
    }
    const result = await screenshotUseCase.upload(deviceId, req.file.buffer, req.file.originalname)
    if (!result.ok) {
      res.status(500).json({ error: result.error.message })
      return
    }
    res.status(201).json({ screenshot: result.value })
  })

  // GET /api/screenshots?deviceId=&limit=&offset= — padre consulta capturas
  router.get('/', requireAuth, async (req: Request, res: Response) => {
    const deviceId = req.query.deviceId as string
    const limit = parseInt(req.query.limit as string, 10) || 50
    const offset = parseInt(req.query.offset as string, 10) || 0

    if (!deviceId) {
      res.status(400).json({ error: 'deviceId requerido' })
      return
    }
    const result = await screenshotUseCase.getByDevice(deviceId, limit, offset)
    if (!result.ok) {
      res.status(500).json({ error: result.error.message })
      return
    }
    res.json({ screenshots: result.value })
  })

  return router
}
