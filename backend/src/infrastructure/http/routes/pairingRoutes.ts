import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { requireAuth } from '../middleware/authMiddleware'
import { query, queryOne } from '../../database/PostgreSQLConnection'
import { RegisterDeviceUseCase } from '../../../application/use-cases/device/RegisterDeviceUseCase'

const createPairingSchema = z.object({
  deviceName: z.string().min(1, 'El nombre del dispositivo es obligatorio'),
})

const pairSchema = z.object({
  pairingCode: z.string().min(4, 'Código inválido'),
  deviceModel: z.string().nullable().optional(),
  androidVersion: z.string().nullable().optional(),
  appVersion: z.string().nullable().optional(),
})

function generateCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}

export function createPairingRoutes(
  registerDeviceUseCase: RegisterDeviceUseCase,
): Router {
  const router = Router()

  // POST /pairing/create — el padre genera un código de emparejamiento
  router.post('/create', requireAuth, async (req: Request, res: Response) => {
    const parsed = createPairingSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message })
      return
    }

    const code = generateCode()
    await query(
      `INSERT INTO pairing_codes (id, user_id, device_name, code)
       VALUES ($1, $2, $3, $4)`,
      [uuidv4(), req.userId!, parsed.data.deviceName, code],
    )

    // El código expira en 24h — ver migración
    res.status(201).json({ code, expiresIn: '24h' })
  })

  // POST /pairing/pair — la app del hijo usa el código para registrarse
  router.post('/pair', async (req: Request, res: Response) => {
    const parsed = pairSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message })
      return
    }

    const pairingRow = await queryOne<{
      id: string; user_id: string; device_name: string; code: string; used: boolean; expires_at: Date
    }>(
      `SELECT * FROM pairing_codes
       WHERE code = $1 AND NOT used AND expires_at > NOW()`,
      [parsed.data.pairingCode.toUpperCase()],
    )

    if (!pairingRow) {
      res.status(404).json({ error: 'Código inválido o expirado' })
      return
    }

    // Marcar el código como usado
    await query('UPDATE pairing_codes SET used = true WHERE id = $1', [pairingRow.id])

    // Registrar el dispositivo
    const result = await registerDeviceUseCase.execute({
      userId: pairingRow.user_id,
      name: pairingRow.device_name,
      alias: null,
      deviceModel: parsed.data.deviceModel ?? null,
      androidVersion: parsed.data.androidVersion ?? null,
      appVersion: parsed.data.appVersion ?? null,
    })

    if (!result.ok) {
      res.status(500).json({ error: result.error.message })
      return
    }

    res.status(201).json({
      deviceId: result.value.device.id,
      deviceToken: result.value.deviceAccessToken,
    })
  })

  return router
}
