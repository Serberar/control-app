import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { LoginUseCase } from '../../../application/use-cases/auth/LoginUseCase'
import { RefreshTokenUseCase } from '../../../application/use-cases/auth/RefreshTokenUseCase'
import { IUserRepository } from '../../../domain/ports/repositories/IUserRepository'
import { requireAuth } from '../middleware/authMiddleware'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token requerido'),
})

const fcmTokenSchema = z.object({
  fcmToken: z.string().min(1),
})

export function createAuthRoutes(
  loginUseCase: LoginUseCase,
  refreshTokenUseCase: RefreshTokenUseCase,
  userRepository: IUserRepository,
): Router {
  const router = Router()

  // POST /auth/login
  router.post('/login', async (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message })
      return
    }

    const result = await loginUseCase.execute(parsed.data)
    if (!result.ok) {
      res.status(401).json({ error: result.error.message })
      return
    }

    res.json(result.value)
  })

  // POST /auth/refresh
  router.post('/refresh', async (req: Request, res: Response) => {
    const parsed = refreshSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message })
      return
    }

    const result = await refreshTokenUseCase.execute(parsed.data)
    if (!result.ok) {
      res.status(401).json({ error: result.error.message })
      return
    }

    res.json(result.value)
  })

  // POST /auth/fcm-token — padre registra su FCM token para recibir alertas push
  router.post('/fcm-token', requireAuth, async (req: Request, res: Response) => {
    const parsed = fcmTokenSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message })
      return
    }
    await userRepository.updateFcmToken(req.userId!, parsed.data.fcmToken)
    res.json({ ok: true })
  })

  return router
}
