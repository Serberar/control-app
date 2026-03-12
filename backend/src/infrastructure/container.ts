// Contenedor de inyección de dependencias — composición manual sin framework
// Siguiendo arquitectura hexagonal estricta: infraestructura instancia todo

import { JWTAuthService } from './services/JWTAuthService'
import { FCMNotificationService } from './services/FCMNotificationService'

import { PostgreSQLUserRepository } from './database/repositories/PostgreSQLUserRepository'
import { PostgreSQLDeviceRepository } from './database/repositories/PostgreSQLDeviceRepository'
import { PostgreSQLLocationRepository } from './database/repositories/PostgreSQLLocationRepository'
import { PostgreSQLMessageRepository } from './database/repositories/PostgreSQLMessageRepository'
import { PostgreSQLCallLogRepository } from './database/repositories/PostgreSQLCallLogRepository'
import { PostgreSQLContactRepository } from './database/repositories/PostgreSQLContactRepository'
import { PostgreSQLMediaRepository } from './database/repositories/PostgreSQLMediaRepository'
import { PostgreSQLUrlHistoryRepository } from './database/repositories/PostgreSQLUrlHistoryRepository'
import { PostgreSQLAlertRepository } from './database/repositories/PostgreSQLAlertRepository'
import { PostgreSQLKeywordRepository } from './database/repositories/PostgreSQLKeywordRepository'
import { PostgreSQLGeofenceRepository } from './database/repositories/PostgreSQLGeofenceRepository'
import { PostgreSQLAppUsageRepository } from './database/repositories/PostgreSQLAppUsageRepository'
import { PostgreSQLAppRuleRepository } from './database/repositories/PostgreSQLAppRuleRepository'
import { PostgreSQLScheduleRepository } from './database/repositories/PostgreSQLScheduleRepository'
import { PostgreSQLScreenshotRepository } from './database/repositories/PostgreSQLScreenshotRepository'

import { LoginUseCase } from '../application/use-cases/auth/LoginUseCase'
import { RefreshTokenUseCase } from '../application/use-cases/auth/RefreshTokenUseCase'
import { RegisterDeviceUseCase } from '../application/use-cases/device/RegisterDeviceUseCase'
import { GetDevicesUseCase } from '../application/use-cases/device/GetDevicesUseCase'
import { HeartbeatUseCase } from '../application/use-cases/device/HeartbeatUseCase'
import { GetDeviceSummaryUseCase } from '../application/use-cases/device/GetDeviceSummaryUseCase'
import { RecordLocationUseCase } from '../application/use-cases/location/RecordLocationUseCase'
import { GetLocationHistoryUseCase } from '../application/use-cases/location/GetLocationHistoryUseCase'
import { RequestLiveLocationUseCase } from '../application/use-cases/location/RequestLiveLocationUseCase'
import { SaveMessagesUseCase } from '../application/use-cases/messages/SaveMessagesUseCase'
import { GetMessagesUseCase } from '../application/use-cases/messages/GetMessagesUseCase'
import { SaveCallLogsUseCase } from '../application/use-cases/calls/SaveCallLogsUseCase'
import { GetCallLogsUseCase } from '../application/use-cases/calls/GetCallLogsUseCase'
import { SyncContactsUseCase } from '../application/use-cases/contacts/SyncContactsUseCase'
import { UploadThumbnailUseCase } from '../application/use-cases/media/UploadThumbnailUseCase'
import { UploadFullMediaUseCase } from '../application/use-cases/media/UploadFullMediaUseCase'
import { GetGalleryUseCase } from '../application/use-cases/media/GetGalleryUseCase'
import { SaveUrlsUseCase } from '../application/use-cases/urlhistory/SaveUrlsUseCase'
import { GetUrlHistoryUseCase } from '../application/use-cases/urlhistory/GetUrlHistoryUseCase'
import { TriggerAlertUseCase } from '../application/use-cases/alerts/TriggerAlertUseCase'
import { GetAlertsUseCase } from '../application/use-cases/alerts/GetAlertsUseCase'
import { ManageKeywordsUseCase } from '../application/use-cases/alerts/ManageKeywordsUseCase'
import { GeofenceUseCase } from '../application/use-cases/geofence/GeofenceUseCase'
import { AppUsageUseCase } from '../application/use-cases/appusage/AppUsageUseCase'
import { AppRulesUseCase } from '../application/use-cases/appusage/AppRulesUseCase'
import { ScheduleUseCase } from '../application/use-cases/schedule/ScheduleUseCase'
import { ScreenshotUseCase } from '../application/use-cases/screenshot/ScreenshotUseCase'

import { createAuthRoutes } from './http/routes/authRoutes'
import { createDeviceRoutes } from './http/routes/deviceRoutes'
import { createLocationRoutes } from './http/routes/locationRoutes'
import { createPairingRoutes } from './http/routes/pairingRoutes'
import { createMessageRoutes } from './http/routes/messageRoutes'
import { createCallRoutes } from './http/routes/callRoutes'
import { createMediaRoutes } from './http/routes/mediaRoutes'
import { createUrlHistoryRoutes } from './http/routes/urlHistoryRoutes'
import { createAlertRoutes } from './http/routes/alertRoutes'
import { createGeofenceRoutes } from './http/routes/geofenceRoutes'
import { createAppRoutes } from './http/routes/appRoutes'
import { createScheduleRoutes } from './http/routes/scheduleRoutes'
import { createScreenshotRoutes } from './http/routes/screenshotRoutes'
import { InactivityCheckJob } from './jobs/InactivityCheckJob'
import { IWebSocketService } from '../domain/ports/services/IWebSocketService'

export function buildContainer(webSocketService: IWebSocketService) {
  // Servicios
  const authService = new JWTAuthService()
  const notificationService = new FCMNotificationService()

  // Repositorios
  const userRepository = new PostgreSQLUserRepository()
  const deviceRepository = new PostgreSQLDeviceRepository()
  const locationRepository = new PostgreSQLLocationRepository()
  const messageRepository = new PostgreSQLMessageRepository()
  const callLogRepository = new PostgreSQLCallLogRepository()
  const contactRepository = new PostgreSQLContactRepository()
  const mediaRepository = new PostgreSQLMediaRepository()
  const urlHistoryRepository = new PostgreSQLUrlHistoryRepository()
  const alertRepository = new PostgreSQLAlertRepository()
  const keywordRepository = new PostgreSQLKeywordRepository()
  const geofenceRepository = new PostgreSQLGeofenceRepository()
  const appUsageRepository = new PostgreSQLAppUsageRepository()
  const appRuleRepository = new PostgreSQLAppRuleRepository()
  const scheduleRepository = new PostgreSQLScheduleRepository()
  const screenshotRepository = new PostgreSQLScreenshotRepository()

  // Casos de uso — auth
  const loginUseCase = new LoginUseCase(userRepository, authService)
  const refreshTokenUseCase = new RefreshTokenUseCase(userRepository, authService)

  // Casos de uso — device
  const registerDeviceUseCase = new RegisterDeviceUseCase(deviceRepository, authService)
  const getDevicesUseCase = new GetDevicesUseCase(deviceRepository)
  const heartbeatUseCase = new HeartbeatUseCase(deviceRepository, triggerAlertUseCase)

  // Casos de uso — alertas y palabras clave (antes de location y messages)
  const manageKeywordsUseCase = new ManageKeywordsUseCase(keywordRepository)
  const triggerAlertUseCase = new TriggerAlertUseCase(alertRepository, deviceRepository, userRepository, notificationService)
  const getAlertsUseCase = new GetAlertsUseCase(alertRepository)

  // Casos de uso — geofences
  const geofenceUseCase = new GeofenceUseCase(geofenceRepository)

  // Casos de uso — uso de apps y reglas
  const appUsageUseCase = new AppUsageUseCase(appUsageRepository)
  const appRulesUseCase = new AppRulesUseCase(appRuleRepository)

  // Casos de uso — horarios y capturas
  const scheduleUseCase = new ScheduleUseCase(scheduleRepository)
  const screenshotUseCase = new ScreenshotUseCase(screenshotRepository)

  // Casos de uso — location (con geofence check)
  const recordLocationUseCase = new RecordLocationUseCase(locationRepository, deviceRepository, webSocketService, geofenceUseCase, triggerAlertUseCase)
  const getLocationHistoryUseCase = new GetLocationHistoryUseCase(locationRepository, deviceRepository)
  const requestLiveLocationUseCase = new RequestLiveLocationUseCase(deviceRepository, locationRepository, webSocketService)

  // Casos de uso — mensajes (con keyword engine)
  const saveMessagesUseCase = new SaveMessagesUseCase(messageRepository, manageKeywordsUseCase, triggerAlertUseCase)
  const getMessagesUseCase = new GetMessagesUseCase(messageRepository)

  // Casos de uso — llamadas y contactos
  const saveCallLogsUseCase = new SaveCallLogsUseCase(callLogRepository)
  const getCallLogsUseCase = new GetCallLogsUseCase(callLogRepository)
  const syncContactsUseCase = new SyncContactsUseCase(contactRepository, triggerAlertUseCase)

  // Casos de uso — media
  const uploadThumbnailUseCase = new UploadThumbnailUseCase(mediaRepository)
  const uploadFullMediaUseCase = new UploadFullMediaUseCase(mediaRepository)
  const getGalleryUseCase = new GetGalleryUseCase(mediaRepository)

  // Casos de uso — historial web
  const saveUrlsUseCase = new SaveUrlsUseCase(urlHistoryRepository)
  const getUrlHistoryUseCase = new GetUrlHistoryUseCase(urlHistoryRepository)

  // Casos de uso — resumen dispositivo
  const getDeviceSummaryUseCase = new GetDeviceSummaryUseCase(
    deviceRepository,
    locationRepository,
    alertRepository,
    messageRepository,
    mediaRepository,
  )

  // Rutas
  const authRoutes = createAuthRoutes(loginUseCase, refreshTokenUseCase, userRepository)
  const deviceRoutes = createDeviceRoutes(registerDeviceUseCase, getDevicesUseCase, heartbeatUseCase, webSocketService)
  const locationRoutes = createLocationRoutes(recordLocationUseCase, getLocationHistoryUseCase, requestLiveLocationUseCase)
  const pairingRoutes = createPairingRoutes(registerDeviceUseCase)
  const messageRoutes = createMessageRoutes(saveMessagesUseCase, getMessagesUseCase)
  const callRoutes = createCallRoutes(saveCallLogsUseCase, getCallLogsUseCase, syncContactsUseCase, contactRepository)
  const mediaRoutes = createMediaRoutes(uploadThumbnailUseCase, uploadFullMediaUseCase, getGalleryUseCase)
  const webRoutes = createUrlHistoryRoutes(saveUrlsUseCase, getUrlHistoryUseCase)
  const alertRoutes = createAlertRoutes(getAlertsUseCase, manageKeywordsUseCase, triggerAlertUseCase)
  const geofenceRoutes = createGeofenceRoutes(geofenceUseCase, getDeviceSummaryUseCase, webSocketService)
  const appRoutes = createAppRoutes(appUsageUseCase, appRulesUseCase)
  const scheduleRoutes = createScheduleRoutes(scheduleUseCase)
  const screenshotRoutes = createScreenshotRoutes(screenshotUseCase)

  const inactivityCheckJob = new InactivityCheckJob(deviceRepository, alertRepository, triggerAlertUseCase)

  return {
    auth: authRoutes,
    devices: deviceRoutes,
    location: locationRoutes,
    pairing: pairingRoutes,
    messages: messageRoutes,
    calls: callRoutes,
    media: mediaRoutes,
    web: webRoutes,
    alerts: alertRoutes,
    geofences: geofenceRoutes,
    apps: appRoutes,
    schedules: scheduleRoutes,
    screenshots: screenshotRoutes,
    inactivityCheckJob,
  }
}
