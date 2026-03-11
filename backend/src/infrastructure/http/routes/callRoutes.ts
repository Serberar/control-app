import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { SaveCallLogsUseCase } from '../../../application/use-cases/calls/SaveCallLogsUseCase'
import { GetCallLogsUseCase } from '../../../application/use-cases/calls/GetCallLogsUseCase'
import { SyncContactsUseCase } from '../../../application/use-cases/contacts/SyncContactsUseCase'
import { IContactRepository } from '../../../domain/ports/repositories/IContactRepository'
import { requireAuth, requireDeviceAuth } from '../middleware/authMiddleware'

const callSchema = z.object({
  source: z.enum(['native', 'whatsapp', 'telegram']),
  contactName: z.string().nullable().optional(),
  phoneNumber: z.string().min(1),
  type: z.enum(['incoming', 'outgoing', 'missed']),
  durationSeconds: z.number().int().min(0),
  timestamp: z.number().int().positive(),
})

const callBatchSchema = z.object({
  calls: z.array(callSchema).min(1).max(200),
})

const callQuerySchema = z.object({
  deviceId: z.string().uuid(),
  source: z.enum(['native', 'whatsapp', 'telegram']).optional(),
  type: z.enum(['incoming', 'outgoing', 'missed']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

const contactSchema = z.object({
  name: z.string().min(1),
  phoneNumbers: z.array(z.string()),
  emails: z.array(z.string()),
})

const contactSyncSchema = z.object({
  contacts: z.array(contactSchema).max(5000),
})

export function createCallRoutes(
  saveCallLogsUseCase: SaveCallLogsUseCase,
  getCallLogsUseCase: GetCallLogsUseCase,
  syncContactsUseCase: SyncContactsUseCase,
  contactRepository: IContactRepository,
): Router {
  const router = Router()

  // POST /calls — dispositivo hijo sube registros de llamadas
  router.post('/', requireDeviceAuth, async (req: Request, res: Response) => {
    const parsed = callBatchSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message })
      return
    }

    const result = await saveCallLogsUseCase.execute({
      deviceId: req.deviceId!,
      calls: parsed.data.calls.map((c) => ({
        ...c,
        contactName: c.contactName ?? null,
      })),
    })

    if (!result.ok) {
      res.status(500).json({ error: result.error.message })
      return
    }

    res.status(201).json({ ok: true, saved: result.value })
  })

  // GET /calls — padre consulta registros de llamadas
  router.get('/', requireAuth, async (req: Request, res: Response) => {
    const parsed = callQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message })
      return
    }

    const result = await getCallLogsUseCase.execute({
      deviceId: parsed.data.deviceId,
      source: parsed.data.source,
      type: parsed.data.type,
      from: parsed.data.from ? new Date(parsed.data.from) : undefined,
      to: parsed.data.to ? new Date(parsed.data.to) : undefined,
      limit: parsed.data.limit,
    })

    if (!result.ok) {
      res.status(500).json({ error: result.error.message })
      return
    }

    res.json({ calls: result.value })
  })

  // POST /calls/contacts — sincronización completa de contactos (dispositivo hijo)
  router.post('/contacts', requireDeviceAuth, async (req: Request, res: Response) => {
    const parsed = contactSyncSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message })
      return
    }

    const result = await syncContactsUseCase.execute({
      deviceId: req.deviceId!,
      contacts: parsed.data.contacts,
    })

    if (!result.ok) {
      res.status(500).json({ error: result.error.message })
      return
    }

    res.json({ ok: true, synced: result.value })
  })

  // GET /calls/contacts — padre obtiene lista de contactos del dispositivo
  router.get('/contacts', requireAuth, async (req: Request, res: Response) => {
    const deviceId = req.query.deviceId as string
    if (!deviceId) {
      res.status(400).json({ error: 'deviceId requerido' })
      return
    }

    const contacts = await contactRepository.findByDevice(deviceId)
    res.json({ contacts })
  })

  return router
}
