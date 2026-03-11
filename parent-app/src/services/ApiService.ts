import axios, { AxiosInstance } from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Device, LocationPoint, TokenPair, AuthUser, ConversationSummary, Message, MessageApp, CallLog, Contact, GalleryItem, UrlHistoryEntry, DomainStat, Alert, Geofence, DeviceSummary } from '../types'

const SERVER_URL = 'https://control.tudominio.com' // Cambiar por tu dominio

class ApiService {
  private client: AxiosInstance
  private refreshPromise: Promise<void> | null = null

  constructor() {
    this.client = axios.create({
      baseURL: `${SERVER_URL}/api`,
      timeout: 15000,
    })

    // Interceptor: añade el token a cada petición
    this.client.interceptors.request.use(async (config) => {
      const token = await AsyncStorage.getItem('accessToken')
      if (token) config.headers.Authorization = `Bearer ${token}`
      return config
    })

    // Interceptor: refresca el token si expira
    this.client.interceptors.response.use(
      (res) => res,
      async (error) => {
        if (error.response?.status === 401 && !error.config._retry) {
          error.config._retry = true
          await this.refreshTokenIfNeeded()
          const token = await AsyncStorage.getItem('accessToken')
          error.config.headers.Authorization = `Bearer ${token}`
          return this.client(error.config)
        }
        return Promise.reject(error)
      },
    )
  }

  // ─── Auth ────────────────────────────────────────────────────────────────

  async login(email: string, password: string): Promise<{ tokens: TokenPair; user: AuthUser }> {
    const res = await this.client.post('/auth/login', { email, password })
    return res.data
  }

  async saveTokens(tokens: TokenPair): Promise<void> {
    await AsyncStorage.multiSet([
      ['accessToken', tokens.accessToken],
      ['refreshToken', tokens.refreshToken],
    ])
  }

  async clearTokens(): Promise<void> {
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken'])
  }

  async getAccessToken(): Promise<string | null> {
    return AsyncStorage.getItem('accessToken')
  }

  private async refreshTokenIfNeeded(): Promise<void> {
    if (this.refreshPromise) return this.refreshPromise

    this.refreshPromise = (async () => {
      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken')
        if (!refreshToken) throw new Error('Sin refresh token')

        const res = await axios.post(`${SERVER_URL}/api/auth/refresh`, { refreshToken })
        await this.saveTokens(res.data)
      } finally {
        this.refreshPromise = null
      }
    })()

    return this.refreshPromise
  }

  // ─── Emparejamiento ────────────────────────────────────────────────────

  async createPairingCode(deviceName: string): Promise<{ code: string; expiresIn: string }> {
    const res = await this.client.post('/pairing/create', { deviceName })
    return res.data
  }

  // ─── Dispositivos ──────────────────────────────────────────────────────

  async getDevices(): Promise<Device[]> {
    const res = await this.client.get('/devices')
    return res.data.devices
  }

  // ─── Ubicación ────────────────────────────────────────────────────────

  async getLocationHistory(deviceId: string, from: Date, to: Date): Promise<LocationPoint[]> {
    const res = await this.client.get('/location/history', {
      params: {
        deviceId,
        from: from.toISOString(),
        to: to.toISOString(),
      },
    })
    return res.data.points
  }

  async getLatestLocation(deviceId: string): Promise<LocationPoint | null> {
    const res = await this.client.get(`/location/latest/${deviceId}`)
    return res.data.point
  }

  async requestLocationNow(deviceId: string): Promise<{ sent: boolean }> {
    const res = await this.client.post(`/location/request-now/${deviceId}`)
    return res.data
  }

  async startLiveLocation(deviceId: string): Promise<void> {
    await this.client.post(`/location/live/start/${deviceId}`)
  }

  async stopLiveLocation(deviceId: string): Promise<void> {
    await this.client.post(`/location/live/stop/${deviceId}`)
  }

  // ─── Mensajes ──────────────────────────────────────────────────────────

  async getConversations(deviceId: string): Promise<ConversationSummary[]> {
    const res = await this.client.get('/messages/conversations', { params: { deviceId } })
    return res.data.conversations
  }

  async getMessages(
    deviceId: string,
    app: MessageApp,
    contactIdentifier: string,
    limit = 100,
  ): Promise<Message[]> {
    const res = await this.client.get('/messages', {
      params: { deviceId, app, contactIdentifier, limit },
    })
    return res.data.messages
  }

  // ─── Llamadas y contactos ──────────────────────────────────────────────

  async getCallLogs(deviceId: string, limit = 100): Promise<CallLog[]> {
    const res = await this.client.get('/calls', { params: { deviceId, limit } })
    return res.data.calls
  }

  async getContacts(deviceId: string): Promise<Contact[]> {
    const res = await this.client.get('/calls/contacts', { params: { deviceId } })
    return res.data.contacts
  }

  // ─── Galería ───────────────────────────────────────────────────────────

  async getGallery(
    deviceId: string,
    fileType?: 'photo' | 'video',
    limit = 50,
    offset = 0,
  ): Promise<GalleryItem[]> {
    const res = await this.client.get('/media', {
      params: { deviceId, fileType, limit, offset },
      // Media se sirve en /media (no /api/media) — usar baseURL sin /api
      baseURL: SERVER_URL,
    })
    return res.data.media
  }

  // ─── Historial web ─────────────────────────────────────────────────────

  async getWebHistory(
    deviceId: string,
    domain?: string,
    limit = 100,
    offset = 0,
  ): Promise<UrlHistoryEntry[]> {
    const res = await this.client.get('/web', {
      params: { deviceId, domain, limit, offset },
    })
    return res.data.entries
  }

  async getTopDomains(deviceId: string, limit = 20): Promise<DomainStat[]> {
    const res = await this.client.get('/web/top-domains', {
      params: { deviceId, limit },
    })
    return res.data.domains
  }

  // ─── Alertas y palabras clave ──────────────────────────────────────────

  async getAlerts(
    deviceId: string,
    unreadOnly = false,
    limit = 100,
    offset = 0,
  ): Promise<{ alerts: Alert[]; unreadCount: number }> {
    const res = await this.client.get('/alerts', {
      params: { deviceId, unreadOnly, limit, offset },
    })
    return { alerts: res.data.alerts, unreadCount: res.data.unreadCount }
  }

  async markAlertRead(alertId: string): Promise<void> {
    await this.client.patch(`/alerts/${alertId}/read`)
  }

  async getKeywords(deviceId: string): Promise<string[]> {
    const res = await this.client.get('/alerts/keywords', { params: { deviceId } })
    return res.data.words
  }

  async setKeywords(deviceId: string, words: string[]): Promise<void> {
    await this.client.put('/alerts/keywords', { words }, { params: { deviceId } })
  }

  async registerParentFcmToken(fcmToken: string): Promise<void> {
    await this.client.post('/auth/fcm-token', { fcmToken })
  }

  // ─── Geofences ─────────────────────────────────────────────────────────

  async getGeofences(deviceId: string): Promise<Geofence[]> {
    const res = await this.client.get('/geofences', { params: { deviceId } })
    return res.data.geofences
  }

  async createGeofence(
    deviceId: string,
    name: string,
    latitude: number,
    longitude: number,
    radiusMeters: number,
  ): Promise<Geofence> {
    const res = await this.client.post('/geofences', { deviceId, name, latitude, longitude, radiusMeters })
    return res.data.geofence
  }

  async deleteGeofence(id: string): Promise<void> {
    await this.client.delete(`/geofences/${id}`)
  }

  async setGeofenceActive(id: string, active: boolean): Promise<void> {
    await this.client.patch(`/geofences/${id}/active`, { active })
  }

  // ─── Resumen de dispositivo ────────────────────────────────────────────

  async getDeviceSummary(deviceId: string): Promise<DeviceSummary> {
    const res = await this.client.get('/geofences/summary', { params: { deviceId } })
    return res.data.summary
  }

  // Convierte la ruta relativa devuelta por el servidor en URL completa
  resolveMediaUrl(path: string): string {
    if (path.startsWith('http')) return path
    return `${SERVER_URL}${path}`
  }
}

export const api = new ApiService()
