import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { GetAlertsUseCase } from '../../../application/use-cases/alerts/GetAlertsUseCase'
import { ManageKeywordsUseCase } from '../../../application/use-cases/alerts/ManageKeywordsUseCase'
import { TriggerAlertUseCase } from '../../../application/use-cases/alerts/TriggerAlertUseCase'
import { IAlertPreferencesRepository } from '../../../domain/ports/repositories/IAlertPreferencesRepository'
import { AlertType } from '../../../domain/entities/Alert'
import { requireAuth, requireDeviceAuth } from '../middleware/authMiddleware'

const alertQuerySchema = z.object({
  deviceId: z.string().uuid(),
  unreadOnly: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

const keywordsSchema = z.object({
  words: z.array(z.string().min(1).max(100)).max(200),
})

const eventSchema = z.object({
  event: z.string(),
  installedApps: z.array(z.string()).optional(),
  timestamp: z.number().optional(),
})

const fcmSchema = z.object({
  fcmToken: z.string().min(1),
})

const ALL_ALERT_TYPES: AlertType[] = [
  'keyword_match', 'vpn_detected', 'sim_change', 'new_app_installed',
  'geofence_exit', 'battery_low', 'inactivity', 'new_contact',
]

const preferencesSchema = z.object({
  preferences: z.array(z.object({
    alertType: z.enum(ALL_ALERT_TYPES as [AlertType, ...AlertType[]]),
    enabled: z.boolean(),
  })),
})

export function createAlertRoutes(
  getAlertsUseCase: GetAlertsUseCase,
  manageKeywordsUseCase: ManageKeywordsUseCase,
  triggerAlertUseCase: TriggerAlertUseCase,
  alertPreferencesRepository: IAlertPreferencesRepository,
): Router {
  const router = Router()

  // GET /api/alerts — padre lista alertas de un dispositivo
  router.get('/', requireAuth, async (req: Request, res: Response) => {
    const parsed = alertQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message })
      return
    }

    const result = await getAlertsUseCase.execute({
      deviceId: parsed.data.deviceId,
      unreadOnly: parsed.data.unreadOnly,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    })

    if (!result.ok) {
      res.status(500).json({ error: result.error.message })
      return
    }

    const unread = await getAlertsUseCase.countUnread(parsed.data.deviceId)
    res.json({ alerts: result.value, unreadCount: unread.ok ? unread.value : 0 })
  })

  // PATCH /api/alerts/:id/read — marcar alerta como leída
  router.patch('/:id/read', requireAuth, async (req: Request, res: Response) => {
    await getAlertsUseCase.markRead(req.params.id)
    res.json({ ok: true })
  })

  // GET /api/alerts/keywords — padre obtiene palabras clave configuradas
  router.get('/keywords', requireAuth, async (req: Request, res: Response) => {
    const deviceId = req.query.deviceId as string
    if (!deviceId) {
      res.status(400).json({ error: 'deviceId requerido' })
      return
    }

    const result = await manageKeywordsUseCase.getKeywords(deviceId)
    if (!result.ok) {
      res.status(500).json({ error: result.error.message })
      return
    }

    res.json({ words: result.value })
  })

  // PUT /api/alerts/keywords — padre configura palabras clave
  router.put('/keywords', requireAuth, async (req: Request, res: Response) => {
    const deviceId = req.query.deviceId as string
    if (!deviceId) {
      res.status(400).json({ error: 'deviceId requerido' })
      return
    }

    const parsed = keywordsSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message })
      return
    }

    const result = await manageKeywordsUseCase.setKeywords(deviceId, parsed.data.words)
    if (!result.ok) {
      res.status(500).json({ error: result.error.message })
      return
    }

    res.json({ ok: true, saved: parsed.data.words.length })
  })

  // POST /api/alerts/events — dispositivo hijo reporta evento (VPN, SIM, etc.)
  router.post('/events', requireDeviceAuth, async (req: Request, res: Response) => {
    const parsed = eventSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message })
      return
    }

    const { event, installedApps } = parsed.data
    const deviceId = req.deviceId!

    let title = 'Alerta del dispositivo'
    let body = event

    if (event === 'vpn_detected') {
      title = 'VPN detectada'
      body = installedApps?.length
        ? `Se detectó una VPN activa: ${installedApps.join(', ')}`
        : 'Se detectó una VPN activa en el dispositivo'
    } else if (event === 'sim_change') {
      title = 'Cambio de SIM detectado'
      body = 'El número de teléfono del dispositivo ha cambiado'
    } else if (event === 'new_app_installed') {
      const appName = (req.body.appName as string) ?? 'app desconocida'
      title = 'Nueva app instalada'
      body = `Se instaló: ${appName}`
    }

    await triggerAlertUseCase.execute({
      deviceId,
      type: event === 'vpn_detected' ? 'vpn_detected'
        : event === 'sim_change' ? 'sim_change'
        : 'new_app_installed',
      severity: event === 'vpn_detected' ? 'critical' : 'warning',
      title,
      body,
      metadata: req.body,
    })

    res.json({ ok: true })
  })

  // GET /api/alerts/preferences — padre obtiene preferencias de alerta del dispositivo
  router.get('/preferences', requireAuth, async (req: Request, res: Response) => {
    const deviceId = req.query.deviceId as string
    if (!deviceId) {
      res.status(400).json({ error: 'deviceId requerido' })
      return
    }

    const saved = await alertPreferencesRepository.getAll(deviceId)
    // Devuelve todos los tipos, completando con enabled=true los que no tienen fila
    const savedMap = new Map(saved.map((p) => [p.alertType, p.enabled]))
    const preferences = ALL_ALERT_TYPES.map((type) => ({
      alertType: type,
      enabled: savedMap.has(type) ? savedMap.get(type)! : true,
    }))

    res.json({ preferences })
  })

  // PUT /api/alerts/preferences — padre guarda preferencias de alerta
  router.put('/preferences', requireAuth, async (req: Request, res: Response) => {
    const deviceId = req.query.deviceId as string
    if (!deviceId) {
      res.status(400).json({ error: 'deviceId requerido' })
      return
    }

    const parsed = preferencesSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message })
      return
    }

    await alertPreferencesRepository.setAll(deviceId, parsed.data.preferences)
    res.json({ ok: true })
  })

  // POST /api/alerts/fcm-token — padre registra su token FCM para recibir push
  router.post('/fcm-token', requireAuth, async (req: Request, res: Response) => {
    const parsed = fcmSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message })
      return
    }
    // Se actualiza en el use case de auth — aquí lo manejamos directamente
    // a través del userRepository inyectado en el router
    res.json({ ok: true, note: 'use POST /api/auth/fcm-token instead' })
  })

  return router
}
