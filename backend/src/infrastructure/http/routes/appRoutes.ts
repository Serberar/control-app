import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { AppUsageUseCase } from '../../../application/use-cases/appusage/AppUsageUseCase'
import { AppRulesUseCase } from '../../../application/use-cases/appusage/AppRulesUseCase'
import { requireAuth, requireDeviceAuth } from '../middleware/authMiddleware'

const usageItemSchema = z.object({
  packageName: z.string().min(1),
  appLabel: z.string().min(1),
  totalMinutes: z.number().int().min(0),
  openCount: z.number().int().min(0),
  lastUsed: z.string().datetime(),
})

const saveUsageSchema = z.object({
  deviceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  usages: z.array(usageItemSchema).min(1).max(200),
})

const createRuleSchema = z.object({
  deviceId: z.string().uuid(),
  packageName: z.string().min(1),
  appLabel: z.string().min(1),
  ruleType: z.enum(['block', 'time_limit']),
  dailyLimitMinutes: z.number().int().min(1).max(1440).optional(),
})

export function createAppRoutes(
  usageUseCase: AppUsageUseCase,
  rulesUseCase: AppRulesUseCase,
): Router {
  const router = Router()

  // ─── Uso de apps ──────────────────────────────────────────────────────────

  // POST /api/apps/usage — hijo sube estadísticas de uso diario
  router.post('/usage', requireDeviceAuth, async (req: Request, res: Response) => {
    const parsed = saveUsageSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message })
      return
    }
    const result = await usageUseCase.save(parsed.data.deviceId, parsed.data.date, parsed.data.usages)
    if (!result.ok) {
      res.status(500).json({ error: result.error.message })
      return
    }
    res.json({ ok: true })
  })

  // GET /api/apps/usage?deviceId=&from=&to= — padre consulta historial
  router.get('/usage', requireAuth, async (req: Request, res: Response) => {
    const deviceId = req.query.deviceId as string
    const from = req.query.from as string
    const to = req.query.to as string

    if (!deviceId || !from || !to) {
      res.status(400).json({ error: 'deviceId, from y to son requeridos' })
      return
    }

    const result = await usageUseCase.getByDevice(deviceId, from, to)
    if (!result.ok) {
      res.status(500).json({ error: result.error.message })
      return
    }
    res.json({ usages: result.value })
  })

  // GET /api/apps/usage/today?deviceId=&packageName= — hijo consulta su uso de hoy
  router.get('/usage/today', requireDeviceAuth, async (req: Request, res: Response) => {
    const deviceId = req.query.deviceId as string
    const packageName = req.query.packageName as string
    if (!deviceId || !packageName) {
      res.status(400).json({ error: 'deviceId y packageName requeridos' })
      return
    }
    const result = await usageUseCase.getTodayUsage(deviceId, packageName)
    if (!result.ok) {
      res.status(500).json({ error: result.error.message })
      return
    }
    res.json({ totalMinutes: result.value })
  })

  // ─── Reglas de bloqueo ────────────────────────────────────────────────────

  // GET /api/apps/rules?deviceId= — padre y hijo consultan reglas activas
  router.get('/rules', async (req: Request, res: Response) => {
    const deviceId = req.query.deviceId as string
    if (!deviceId) {
      res.status(400).json({ error: 'deviceId requerido' })
      return
    }
    const result = await rulesUseCase.list(deviceId)
    if (!result.ok) {
      res.status(500).json({ error: result.error.message })
      return
    }
    res.json({ rules: result.value })
  })

  // POST /api/apps/rules — padre crea una regla
  router.post('/rules', requireAuth, async (req: Request, res: Response) => {
    const parsed = createRuleSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message })
      return
    }
    const { deviceId, packageName, appLabel, ruleType, dailyLimitMinutes } = parsed.data
    if (ruleType === 'time_limit' && !dailyLimitMinutes) {
      res.status(400).json({ error: 'dailyLimitMinutes requerido para reglas time_limit' })
      return
    }
    const result = await rulesUseCase.create(deviceId, packageName, appLabel, ruleType, dailyLimitMinutes)
    if (!result.ok) {
      res.status(500).json({ error: result.error.message })
      return
    }
    res.status(201).json({ rule: result.value })
  })

  // DELETE /api/apps/rules/:id
  router.delete('/rules/:id', requireAuth, async (req: Request, res: Response) => {
    const result = await rulesUseCase.delete(req.params.id)
    if (!result.ok) {
      res.status(500).json({ error: result.error.message })
      return
    }
    res.json({ ok: true })
  })

  // PATCH /api/apps/rules/:id/active
  router.patch('/rules/:id/active', requireAuth, async (req: Request, res: Response) => {
    const active = Boolean(req.body.active)
    const result = await rulesUseCase.setActive(req.params.id, active)
    if (!result.ok) {
      res.status(500).json({ error: result.error.message })
      return
    }
    res.json({ ok: true })
  })

  return router
}
