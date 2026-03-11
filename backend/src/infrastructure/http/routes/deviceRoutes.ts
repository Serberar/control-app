import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { RegisterDeviceUseCase } from '../../../application/use-cases/device/RegisterDeviceUseCase'
import { GetDevicesUseCase } from '../../../application/use-cases/device/GetDevicesUseCase'
import { HeartbeatUseCase } from '../../../application/use-cases/device/HeartbeatUseCase'
import { requireAuth, requireDeviceAuth } from '../middleware/authMiddleware'
import { IWebSocketService } from '../../../domain/ports/services/IWebSocketService'

const registerSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  alias: z.string().nullable().optional(),
  deviceModel: z.string().nullable().optional(),
  androidVersion: z.string().nullable().optional(),
  appVersion: z.string().nullable().optional(),
})

const heartbeatSchema = z.object({
  batteryLevel: z.number().int().min(0).max(100).nullable().optional(),
  fcmToken: z.string().nullable().optional(),
})

export function createDeviceRoutes(
  registerDeviceUseCase: RegisterDeviceUseCase,
  getDevicesUseCase: GetDevicesUseCase,
  heartbeatUseCase: HeartbeatUseCase,
  webSocketService: IWebSocketService,
): Router {
  const router = Router()

  // POST /devices — el padre registra un dispositivo hijo
  router.post('/', requireAuth, async (req: Request, res: Response) => {
    const parsed = registerSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message })
      return
    }

    const result = await registerDeviceUseCase.execute({
      userId: req.userId!,
      name: parsed.data.name,
      alias: parsed.data.alias ?? null,
      deviceModel: parsed.data.deviceModel ?? null,
      androidVersion: parsed.data.androidVersion ?? null,
      appVersion: parsed.data.appVersion ?? null,
    })

    if (!result.ok) {
      res.status(400).json({ error: result.error.message })
      return
    }

    res.status(201).json({
      device: result.value.device,
      deviceAccessToken: result.value.deviceAccessToken,
    })
  })

  // GET /devices — el padre obtiene sus dispositivos hijo
  router.get('/', requireAuth, async (req: Request, res: Response) => {
    const result = await getDevicesUseCase.execute({ userId: req.userId! })

    if (!result.ok) {
      res.status(500).json({ error: result.error.message })
      return
    }

    const devices = result.value.map((d) => ({
      id: d.id,
      name: d.name,
      alias: d.alias,
      deviceModel: d.deviceModel,
      androidVersion: d.androidVersion,
      appVersion: d.appVersion,
      lastSeenAt: d.lastSeenAt,
      batteryLevel: d.batteryLevel,
      isConnected: webSocketService.isDeviceConnected(d.id),
      isActive: d.isActive,
    }))

    res.json({ devices })
  })

  // POST /devices/heartbeat — el dispositivo hijo informa que sigue vivo
  router.post('/heartbeat', requireDeviceAuth, async (req: Request, res: Response) => {
    const parsed = heartbeatSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message })
      return
    }

    const result = await heartbeatUseCase.execute({
      deviceId: req.deviceId!,
      batteryLevel: parsed.data.batteryLevel ?? null,
      fcmToken: parsed.data.fcmToken ?? null,
    })

    if (!result.ok) {
      res.status(404).json({ error: result.error.message })
      return
    }

    res.json({ ok: true })
  })

  return router
}
