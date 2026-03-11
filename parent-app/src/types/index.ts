export interface Device {
  id: string
  name: string
  alias: string | null
  deviceModel: string | null
  androidVersion: string | null
  appVersion: string | null
  lastSeenAt: string | null
  batteryLevel: number | null
  isConnected: boolean
  isActive: boolean
}

export interface LocationPoint {
  id: string
  deviceId: string
  latitude: number
  longitude: number
  accuracy: number | null
  altitude: number | null
  address: string | null
  createdAt: string
}

export type MessageApp = 'whatsapp' | 'telegram' | 'instagram' | 'sms'

export interface ConversationSummary {
  app: MessageApp
  contactName: string | null
  contactIdentifier: string
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
}

export interface Message {
  id: string
  deviceId: string
  app: MessageApp
  contactName: string | null
  contactIdentifier: string
  direction: 'incoming' | 'outgoing'
  body: string
  timestamp: string
  threadId: string | null
}

export interface CallLog {
  id: string
  deviceId: string
  source: 'native' | 'whatsapp' | 'telegram'
  contactName: string | null
  phoneNumber: string
  type: 'incoming' | 'outgoing' | 'missed'
  durationSeconds: number
  timestamp: string
}

export interface Contact {
  id: string
  deviceId: string
  name: string
  phoneNumbers: string[]
  emails: string[]
}

export interface GalleryItem {
  id: string
  deviceId: string
  fileType: 'photo' | 'video'
  thumbnailUrl: string | null
  fullUrl: string | null
  thumbnailReady: boolean
  fullReady: boolean
  fileSizeBytes: number | null
  takenAt: string | null
  createdAt: string
}

export interface UrlHistoryEntry {
  id: string
  deviceId: string
  url: string
  title: string | null
  source: 'dns' | 'http' | 'https'
  createdAt: string
}

export interface DomainStat {
  domain: string
  visits: number
  lastVisit: string
}

export type AlertType = 'keyword_match' | 'vpn_detected' | 'sim_change' | 'new_app_installed' | 'geofence_exit'

export interface Geofence {
  id: string
  deviceId: string
  name: string
  latitude: number
  longitude: number
  radiusMeters: number
  active: boolean
  createdAt: string
}
export type AlertSeverity = 'info' | 'warning' | 'critical'

export interface Alert {
  id: string
  deviceId: string
  type: AlertType
  severity: AlertSeverity
  title: string
  body: string
  metadata: Record<string, unknown> | null
  readAt: string | null
  createdAt: string
}

export interface DeviceSummary {
  deviceId: string
  deviceName: string
  alias: string | null
  lastSeenAt: string | null
  batteryLevel: number | null
  isConnected: boolean
  lastLocation: {
    latitude: number
    longitude: number
    address: string | null
    at: string
  } | null
  unreadAlerts: number
  messagesLast24h: number
  photosLast24h: number
}

export type MessageAppExtended = MessageApp | 'youtube' | 'tiktok'

export type AppRuleType = 'block' | 'time_limit'

export interface AppUsageStat {
  id: string
  deviceId: string
  packageName: string
  appLabel: string
  date: string
  totalMinutes: number
  openCount: number
  lastUsed: string
}

export interface AppRule {
  id: string
  deviceId: string
  packageName: string
  appLabel: string
  ruleType: AppRuleType
  dailyLimitMinutes: number | null
  isActive: boolean
  createdAt: string
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export interface AuthUser {
  id: string
  email: string
  name: string
}
