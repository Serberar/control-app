import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { SaveMessagesUseCase } from '../../../application/use-cases/messages/SaveMessagesUseCase'
import { GetMessagesUseCase } from '../../../application/use-cases/messages/GetMessagesUseCase'
import { requireAuth, requireDeviceAuth } from '../middleware/authMiddleware'

const APP_ENUM = ['whatsapp', 'telegram', 'instagram', 'sms', 'teams'] as const

const messageSchema = z.object({
  app: z.enum(APP_ENUM),
  contactName: z.string().nullable().optional(),
  contactIdentifier: z.string().min(1),
  direction: z.enum(['incoming', 'outgoing']),
  body: z.string(),
  timestamp: z.number().int().positive(),
  threadId: z.string().nullable().optional(),
})

const batchSchema = z.object({
  messages: z.array(messageSchema).min(1).max(500),
})

const querySchema = z.object({
  deviceId: z.string().uuid(),
  app: z.enum(APP_ENUM).optional(),
  contactIdentifier: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
})

const conversationQuerySchema = z.object({
  deviceId: z.string().uuid(),
  app: z.enum(APP_ENUM).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
})

export function createMessageRoutes(
  saveMessagesUseCase: SaveMessagesUseCase,
  getMessagesUseCase: GetMessagesUseCase,
): Router {
  const router = Router()

  // POST /messages — el dispositivo hijo sube mensajes capturados
  router.post('/', requireDeviceAuth, async (req: Request, res: Response) => {
    const parsed = batchSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message })
      return
    }

    const result = await saveMessagesUseCase.execute({
      deviceId: req.deviceId!,
      messages: parsed.data.messages.map((m) => ({
        ...m,
        contactName: m.contactName ?? null,
        threadId: m.threadId ?? null,
      })),
    })

    if (!result.ok) {
      res.status(500).json({ error: result.error.message })
      return
    }

    res.status(201).json({ ok: true, saved: result.value })
  })

  // GET /messages/conversations — lista de conversaciones del dispositivo (con filtros opcionales)
  router.get('/conversations', requireAuth, async (req: Request, res: Response) => {
    const parsed = conversationQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message })
      return
    }

    const result = await getMessagesUseCase.getConversations({
      deviceId: parsed.data.deviceId,
      app: parsed.data.app,
      from: parsed.data.from ? new Date(parsed.data.from) : undefined,
      to: parsed.data.to ? new Date(parsed.data.to) : undefined,
    })

    if (!result.ok) {
      res.status(500).json({ error: result.error.message })
      return
    }

    res.json({ conversations: result.value })
  })

  // GET /messages — mensajes de una conversación concreta
  router.get('/', requireAuth, async (req: Request, res: Response) => {
    const parsed = querySchema.safeParse(req.query)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message })
      return
    }

    const result = await getMessagesUseCase.getMessages({
      deviceId: parsed.data.deviceId,
      app: parsed.data.app,
      contactIdentifier: parsed.data.contactIdentifier,
      from: parsed.data.from ? new Date(parsed.data.from) : undefined,
      to: parsed.data.to ? new Date(parsed.data.to) : undefined,
      limit: parsed.data.limit,
    })

    if (!result.ok) {
      res.status(500).json({ error: result.error.message })
      return
    }

    res.json({ messages: result.value })
  })

  return router
}
