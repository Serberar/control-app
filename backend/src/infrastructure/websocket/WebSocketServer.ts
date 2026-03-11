import { Server as HttpServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { IWebSocketService, WebSocketEvent } from '../../domain/ports/services/IWebSocketService'
import { JWTAuthService } from '../services/JWTAuthService'

export class WebSocketServer implements IWebSocketService {
  private readonly io: SocketIOServer
  private readonly authService: JWTAuthService

  // deviceId → socketId (conexiones del hijo)
  private readonly deviceSockets = new Map<string, string>()
  // userId → socketId (conexiones del padre)
  private readonly parentSockets = new Map<string, string>()

  private connectCallbacks: ((deviceId: string) => void)[] = []
  private disconnectCallbacks: ((deviceId: string) => void)[] = []

  constructor(httpServer: HttpServer) {
    this.authService = new JWTAuthService()

    this.io = new SocketIOServer(httpServer, {
      cors: { origin: false },
    })

    this.io.use((socket, next) => {
      const token = socket.handshake.auth['token'] as string | undefined
      if (!token) return next(new Error('Token requerido'))

      try {
        // Intentar como token de dispositivo hijo primero
        try {
          const payload = this.authService.verifyDeviceToken(token)
          socket.data.deviceId = payload.deviceId
          socket.data.userId = payload.userId
          socket.data.role = 'device'
          return next()
        } catch {
          // Si falla, intentar como token de padre
          const payload = this.authService.verifyAccessToken(token)
          socket.data.userId = payload.userId
          socket.data.role = 'parent'
          return next()
        }
      } catch {
        next(new Error('Token inválido'))
      }
    })

    this.io.on('connection', (socket: Socket) => {
      if (socket.data.role === 'device') {
        const deviceId = socket.data.deviceId as string
        this.deviceSockets.set(deviceId, socket.id)
        console.log(`[WS] Dispositivo hijo conectado: ${deviceId}`)
        this.connectCallbacks.forEach((cb) => cb(deviceId))

        socket.on('disconnect', () => {
          this.deviceSockets.delete(deviceId)
          this.disconnectCallbacks.forEach((cb) => cb(deviceId))
        })
      } else {
        const userId = socket.data.userId as string
        this.parentSockets.set(userId, socket.id)
        console.log(`[WS] Padre conectado: ${userId}`)

        socket.on('disconnect', () => {
          this.parentSockets.delete(userId)
        })
      }
    })
  }

  sendToDevice(deviceId: string, event: WebSocketEvent, payload?: unknown): boolean {
    const socketId = this.deviceSockets.get(deviceId)
    if (!socketId) return false
    this.io.to(socketId).emit(event, payload)
    return true
  }

  broadcastLocationToParent(userId: string, deviceId: string, point: unknown): void {
    const socketId = this.parentSockets.get(userId)
    if (!socketId) return
    this.io.to(socketId).emit('location:update', { deviceId, point })
  }

  isDeviceConnected(deviceId: string): boolean {
    return this.deviceSockets.has(deviceId)
  }

  onDeviceConnect(callback: (deviceId: string) => void): void {
    this.connectCallbacks.push(callback)
  }

  onDeviceDisconnect(callback: (deviceId: string) => void): void {
    this.disconnectCallbacks.push(callback)
  }
}
