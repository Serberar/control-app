import { Request, Response, NextFunction } from 'express'
import { JWTAuthService } from '../../services/JWTAuthService'

const authService = new JWTAuthService()

// Extiende el tipo de Request para incluir el usuario autenticado
declare global {
  namespace Express {
    interface Request {
      userId?: string
      userEmail?: string
      deviceId?: string
    }
  }
}

// Middleware para rutas del padre (app padre)
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token requerido' })
    return
  }

  const token = authHeader.slice(7)
  try {
    const payload = authService.verifyAccessToken(token)
    req.userId = payload.userId
    req.userEmail = payload.email
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' })
  }
}

// Middleware para rutas del dispositivo hijo
export function requireDeviceAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token requerido' })
    return
  }

  const token = authHeader.slice(7)
  try {
    const payload = authService.verifyDeviceToken(token)
    req.deviceId = payload.deviceId
    req.userId = payload.userId
    next()
  } catch {
    res.status(401).json({ error: 'Token de dispositivo inválido' })
  }
}
