import { Request, Response, NextFunction } from 'express'
import { DomainError, NotFoundError, UnauthorizedError, ConflictError, ValidationError } from '../../../shared/errors/DomainError'

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error('[Error]', err.message)

  if (err instanceof ValidationError) {
    res.status(400).json({ error: err.message, code: err.code })
    return
  }

  if (err instanceof UnauthorizedError) {
    res.status(401).json({ error: err.message, code: err.code })
    return
  }

  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message, code: err.code })
    return
  }

  if (err instanceof ConflictError) {
    res.status(409).json({ error: err.message, code: err.code })
    return
  }

  if (err instanceof DomainError) {
    res.status(400).json({ error: err.message, code: err.code })
    return
  }

  res.status(500).json({ error: 'Error interno del servidor' })
}
