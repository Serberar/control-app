import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { RecordLocationUseCase } from '../../../application/use-cases/location/RecordLocationUseCase'
import { GetLocationHistoryUseCase } from '../../../application/use-cases/location/GetLocationHistoryUseCase'
import { RequestLiveLocationUseCase } from '../../../application/use-cases/location/RequestLiveLocationUseCase'
import { requireAuth, requireDeviceAuth } from '../middleware/authMiddleware'

const recordSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().nullable().optional(),
  altitude: z.number().nullable().optional(),
  address: z.string().nullable().optional(),
})

const historyQuerySchema = z.object({
  deviceId: z.string().uuid('deviceId inválido'),
  from: z.string().datetime('Fecha from inválida'),
  to: z.string().datetime('Fecha to inválida'),
})

export function createLocationRoutes(
  recordLocationUseCase: RecordLocationUseCase,
  getLocationHistoryUseCase: GetLocationHistoryUseCase,
  requestLiveLocationUseCase: RequestLiveLocationUseCase,
): Router {
  const router = Router()

  // POST /location — el dispositivo hijo sube su ubicación
  router.post('/', requireDeviceAuth, async (req: Request, res: Response) => {
    const parsed = recordSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message })
      return
    }

    const result = await recordLocationUseCase.execute({
      deviceId: req.deviceId!,
      ...parsed.data,
      accuracy: parsed.data.accuracy ?? null,
      altitude: parsed.data.altitude ?? null,
      address: parsed.data.address ?? null,
    })

    if (!result.ok) {
      res.status(500).json({ error: result.error.message })
      return
    }

    res.status(201).json({ ok: true, id: result.value.id })
  })

  // GET /location/history — el padre obtiene el historial
  router.get('/history', requireAuth, async (req: Request, res: Response) => {
    const parsed = historyQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message })
      return
    }

    const result = await getLocationHistoryUseCase.execute({
      deviceId: parsed.data.deviceId,
      userId: req.userId!,
      from: new Date(parsed.data.from),
      to: new Date(parsed.data.to),
    })

    if (!result.ok) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 403
      res.status(status).json({ error: result.error.message })
      return
    }

    res.json({ points: result.value })
  })

  // GET /location/latest/:deviceId — última ubicación conocida
  router.get('/latest/:deviceId', requireAuth, async (req: Request, res: Response) => {
    const result = await requestLiveLocationUseCase.getLatest({
      deviceId: req.params.deviceId,
      userId: req.userId!,
    })

    if (!result.ok) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 403
      res.status(status).json({ error: result.error.message })
      return
    }

    res.json({ point: result.value })
  })

  // POST /location/request-now/:deviceId — solicitar ubicación inmediata
  router.post('/request-now/:deviceId', requireAuth, async (req: Request, res: Response) => {
    const result = await requestLiveLocationUseCase.requestNow({
      deviceId: req.params.deviceId,
      userId: req.userId!,
    })

    if (!result.ok) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 403
      res.status(status).json({ error: result.error.message })
      return
    }

    res.json({ sent: result.value.sent })
  })

  // POST /location/live/start/:deviceId — iniciar seguimiento en vivo
  router.post('/live/start/:deviceId', requireAuth, async (req: Request, res: Response) => {
    const result = await requestLiveLocationUseCase.startLive({
      deviceId: req.params.deviceId,
      userId: req.userId!,
    })

    if (!result.ok) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 403
      res.status(status).json({ error: result.error.message })
      return
    }

    res.json({ sent: result.value.sent })
  })

  // POST /location/live/stop/:deviceId — parar seguimiento en vivo
  router.post('/live/stop/:deviceId', requireAuth, async (req: Request, res: Response) => {
    const result = await requestLiveLocationUseCase.stopLive({
      deviceId: req.params.deviceId,
      userId: req.userId!,
    })

    if (!result.ok) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 403
      res.status(status).json({ error: result.error.message })
      return
    }

    res.json({ sent: result.value.sent })
  })

  return router
}
