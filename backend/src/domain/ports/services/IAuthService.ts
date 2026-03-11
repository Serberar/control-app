export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export interface AccessTokenPayload {
  userId: string
  email: string
}

export interface DeviceTokenPayload {
  deviceId: string
  userId: string
}

export interface IAuthService {
  hashPassword(password: string): Promise<string>
  comparePassword(password: string, hash: string): Promise<boolean>
  generateTokenPair(payload: AccessTokenPayload): TokenPair
  generateDeviceAccessToken(payload: DeviceTokenPayload): string
  verifyAccessToken(token: string): AccessTokenPayload
  verifyRefreshToken(token: string): AccessTokenPayload
  verifyDeviceToken(token: string): DeviceTokenPayload
}
