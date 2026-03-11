import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { GeofenceUseCase } from '../../../application/use-cases/geofence/GeofenceUseCase'
import { GetDeviceSummaryUseCase } from '../../../application/use-cases/device/GetDeviceSummaryUseCase'
import { requireAuth } from '../middleware/authMiddleware'
import { IWebSocketService } from '../../../domain/ports/services/IWebSocketService'

const createSchema = z.object({
  deviceId: z.string().uuid(),
  name: z.string().min(1).max(80),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusMeters: z.number().int().min(50).max(50000),
})

export function createGeofenceRoutes(
  geofenceUseCase: GeofenceUseCase,
  summaryUseCase: GetDeviceSummaryUseCase,
  webSocketService: IWebSocketService,
): Router {
  const router = Router()

  // GET /api/geofences?deviceId=... — lista geofences del dispositivo
  router.get('/', requireAuth, async (req: Request, res: Response) => {
    const deviceId = req.query.deviceId as string
    if (!deviceId) {
      res.status(400).json({ error: 'deviceId requerido' })
      return
    }
    const result = await geofenceUseCase.list(deviceId)
    if (!result.ok) {
      res.status(500).json({ error: result.error.message })
      return
    }
    res.json({ geofences: result.value })
  })

  // POST /api/geofences — crear geofence
  router.post('/', requireAuth, async (req: Request, res: Response) => {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message })
      return
    }
    const result = await geofenceUseCase.create(parsed.data)
    if (!result.ok) {
      res.status(500).json({ error: result.error.message })
      return
    }
    res.status(201).json({ geofence: result.value })
  })

  // DELETE /api/geofences/:id
  router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
    await geofenceUseCase.delete(req.params.id)
    res.json({ ok: true })
  })

  // PATCH /api/geofences/:id/active
  router.patch('/:id/active', requireAuth, async (req: Request, res: Response) => {
    const active = Boolean(req.body.active)
    await geofenceUseCase.setActive(req.params.id, active)
    res.json({ ok: true })
  })

  // GET /api/geofences/summary?deviceId=... — resumen del dispositivo
  router.get('/summary', requireAuth, async (req: Request, res: Response) => {
    const deviceId = req.query.deviceId as string
    if (!deviceId) {
      res.status(400).json({ error: 'deviceId requerido' })
      return
    }
    const isConnected = webSocketService.isDeviceConnected(deviceId)
    const result = await summaryUseCase.execute(deviceId, isConnected)
    if (!result.ok) {
      res.status(404).json({ error: result.error.message })
      return
    }
    res.json({ summary: result.value })
  })

  return router
}
