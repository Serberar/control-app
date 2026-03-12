import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { ScheduleUseCase } from '../../../application/use-cases/schedule/ScheduleUseCase'
import { requireAuth, requireDeviceAuth } from '../middleware/authMiddleware'

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/

const createScheduleSchema = z.object({
  deviceId: z.string().uuid(),
  name: z.string().min(1).max(100),
  activeDays: z.number().int().min(0).max(127),  // bitmask 7 bits
  startTime: z.string().regex(timePattern, 'Formato HH:MM requerido'),
  endTime: z.string().regex(timePattern, 'Formato HH:MM requerido'),
})

export function createScheduleRoutes(scheduleUseCase: ScheduleUseCase): Router {
  const router = Router()

  // GET /api/schedules?deviceId= — padre y hijo consultan horarios
  router.get('/', async (req: Request, res: Response) => {
    const deviceId = req.query.deviceId as string
    if (!deviceId) {
      res.status(400).json({ error: 'deviceId requerido' })
      return
    }
    const result = await scheduleUseCase.list(deviceId)
    if (!result.ok) {
      res.status(500).json({ error: result.error.message })
      return
    }
    res.json({ schedules: result.value })
  })

  // GET /api/schedules/locked?deviceId= — hijo consulta si debe bloquear ahora
  router.get('/locked', requireDeviceAuth, async (req: Request, res: Response) => {
    const deviceId = req.query.deviceId as string
    if (!deviceId) {
      res.status(400).json({ error: 'deviceId requerido' })
      return
    }
    const result = await scheduleUseCase.isDeviceLocked(deviceId)
    if (!result.ok) {
      res.status(500).json({ error: result.error.message })
      return
    }
    res.json({ locked: result.value })
  })

  // POST /api/schedules — padre crea un horario
  router.post('/', requireAuth, async (req: Request, res: Response) => {
    const parsed = createScheduleSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message })
      return
    }
    const { deviceId, name, activeDays, startTime, endTime } = parsed.data
    const result = await scheduleUseCase.create(deviceId, name, activeDays, startTime, endTime)
    if (!result.ok) {
      res.status(500).json({ error: result.error.message })
      return
    }
    res.status(201).json({ schedule: result.value })
  })

  // DELETE /api/schedules/:id
  router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
    const result = await scheduleUseCase.delete(req.params.id)
    if (!result.ok) {
      res.status(500).json({ error: result.error.message })
      return
    }
    res.json({ ok: true })
  })

  // PATCH /api/schedules/:id/active
  router.patch('/:id/active', requireAuth, async (req: Request, res: Response) => {
    const active = Boolean(req.body.active)
    const result = await scheduleUseCase.setActive(req.params.id, active)
    if (!result.ok) {
      res.status(500).json({ error: result.error.message })
      return
    }
    res.json({ ok: true })
  })

  return router
}
