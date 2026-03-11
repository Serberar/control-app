import { io, Socket } from 'socket.io-client'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { LocationPoint } from '../types'

const SERVER_URL = 'https://control.tudominio.com'

type LocationListener = (point: LocationPoint) => void

class WebSocketService {
  private socket: Socket | null = null
  private locationListeners: Map<string, LocationListener[]> = new Map()

  async connect(): Promise<void> {
    const token = await AsyncStorage.getItem('accessToken')
    if (!token) return

    this.socket = io(SERVER_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: Infinity,
    })

    this.socket.on('connect', () => {
      console.log('[WS Padre] Conectado al servidor')
    })

    this.socket.on('disconnect', () => {
      console.log('[WS Padre] Desconectado')
    })

    // El servidor nos envía una ubicación en tiempo real (modo live)
    this.socket.on('location:update', (data: { deviceId: string; point: LocationPoint }) => {
      const listeners = this.locationListeners.get(data.deviceId) ?? []
      listeners.forEach((fn) => fn(data.point))
    })
  }

  disconnect(): void {
    this.socket?.disconnect()
    this.socket = null
  }

  onLocationUpdate(deviceId: string, listener: LocationListener): () => void {
    const existing = this.locationListeners.get(deviceId) ?? []
    this.locationListeners.set(deviceId, [...existing, listener])

    // Retorna función para desuscribirse
    return () => {
      const current = this.locationListeners.get(deviceId) ?? []
      this.locationListeners.set(deviceId, current.filter((fn) => fn !== listener))
    }
  }
}

export const wsService = new WebSocketService()
