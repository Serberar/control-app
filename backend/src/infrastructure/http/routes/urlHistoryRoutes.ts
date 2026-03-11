import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { SaveUrlsUseCase } from '../../../application/use-cases/urlhistory/SaveUrlsUseCase'
import { GetUrlHistoryUseCase } from '../../../application/use-cases/urlhistory/GetUrlHistoryUseCase'
import { requireAuth, requireDeviceAuth } from '../middleware/authMiddleware'

const urlEntrySchema = z.object({
  url: z.string().url(),
  title: z.string().nullable().optional(),
  app: z.string().nullable().optional(),
  timestamp: z.number().int().positive(),
})

const batchSchema = z.object({
  entries: z.array(urlEntrySchema).min(1).max(1000),
})

const historyQuerySchema = z.object({
  deviceId: z.string().uuid(),
  domain: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

export function createUrlHistoryRoutes(
  saveUrlsUseCase: SaveUrlsUseCase,
  getUrlHistoryUseCase: GetUrlHistoryUseCase,
): Router {
  const router = Router()

  // POST /web — dispositivo hijo sube lote de URLs visitadas
  router.post('/', requireDeviceAuth, async (req: Request, res: Response) => {
    const parsed = batchSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message })
      return
    }

    const result = await saveUrlsUseCase.execute({
      deviceId: req.deviceId!,
      entries: parsed.data.entries.map((e) => ({
        url: e.url,
        title: e.title ?? null,
        app: e.app ?? null,
        timestamp: e.timestamp,
      })),
    })

    if (!result.ok) {
      res.status(500).json({ error: result.error.message })
      return
    }

    res.status(201).json({ ok: true, saved: result.value })
  })

  // GET /web — padre consulta historial web
  router.get('/', requireAuth, async (req: Request, res: Response) => {
    const parsed = historyQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message })
      return
    }

    const result = await getUrlHistoryUseCase.getHistory({
      deviceId: parsed.data.deviceId,
      domain: parsed.data.domain,
      from: parsed.data.from ? new Date(parsed.data.from) : undefined,
      to: parsed.data.to ? new Date(parsed.data.to) : undefined,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    })

    if (!result.ok) {
      res.status(500).json({ error: result.error.message })
      return
    }

    res.json({ entries: result.value })
  })

  // GET /web/top-domains — dominios más visitados
  router.get('/top-domains', requireAuth, async (req: Request, res: Response) => {
    const deviceId = req.query.deviceId as string
    if (!deviceId) {
      res.status(400).json({ error: 'deviceId requerido' })
      return
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20

    const result = await getUrlHistoryUseCase.getTopDomains(deviceId, limit)
    if (!result.ok) {
      res.status(500).json({ error: result.error.message })
      return
    }

    res.json({ domains: result.value })
  })

  return router
}
