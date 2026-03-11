import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { IAuthService, TokenPair, AccessTokenPayload, DeviceTokenPayload } from '../../domain/ports/services/IAuthService'

export class JWTAuthService implements IAuthService {
  private readonly jwtSecret: string
  private readonly jwtRefreshSecret: string
  private readonly jwtExpiresIn: string
  private readonly jwtRefreshExpiresIn: string

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET ?? ''
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET ?? ''
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN ?? '15m'
    this.jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN ?? '30d'

    if (!this.jwtSecret || !this.jwtRefreshSecret) {
      throw new Error('JWT_SECRET y JWT_REFRESH_SECRET son obligatorios')
    }
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12)
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  generateTokenPair(payload: AccessTokenPayload): TokenPair {
    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn as jwt.SignOptions['expiresIn'],
    })
    const refreshToken = jwt.sign(payload, this.jwtRefreshSecret, {
      expiresIn: this.jwtRefreshExpiresIn as jwt.SignOptions['expiresIn'],
    })
    return { accessToken, refreshToken }
  }

  generateDeviceAccessToken(payload: DeviceTokenPayload): string {
    // Los dispositivos hijo usan tokens de larga duración (1 año)
    return jwt.sign(payload, this.jwtSecret, { expiresIn: '365d' })
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    return jwt.verify(token, this.jwtSecret) as AccessTokenPayload
  }

  verifyRefreshToken(token: string): AccessTokenPayload {
    return jwt.verify(token, this.jwtRefreshSecret) as AccessTokenPayload
  }

  verifyDeviceToken(token: string): DeviceTokenPayload {
    return jwt.verify(token, this.jwtSecret) as DeviceTokenPayload
  }
}
