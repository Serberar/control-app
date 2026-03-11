import { INotificationService, PushPayload } from '../../domain/ports/services/INotificationService'

/**
 * Servicio de push notifications vía Firebase Cloud Messaging (HTTP v1 API).
 *
 * Requiere la variable de entorno FCM_SERVICE_ACCOUNT_JSON con el JSON de
 * la cuenta de servicio de Firebase descargado desde la consola de Firebase.
 *
 * Si FCM_SERVICE_ACCOUNT_JSON no está configurado, las notificaciones
 * se loguean en consola (modo desarrollo).
 */
export class FCMNotificationService implements INotificationService {
  private messaging: import('firebase-admin/messaging').Messaging | null = null

  constructor() {
    this.init()
  }

  private init(): void {
    const serviceAccountJson = process.env.FCM_SERVICE_ACCOUNT_JSON
    if (!serviceAccountJson) {
      console.warn('[FCM] FCM_SERVICE_ACCOUNT_JSON no configurado — modo log')
      return
    }

    try {
      // Carga dinámica para no romper si firebase-admin no está instalado
      const admin = require('firebase-admin')
      const serviceAccount = JSON.parse(serviceAccountJson)

      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        })
      }

      this.messaging = admin.messaging()
    } catch (e) {
      console.error('[FCM] Error inicializando Firebase Admin:', e)
    }
  }

  async sendToToken(fcmToken: string, payload: PushPayload): Promise<void> {
    if (!this.messaging) {
      console.log(`[FCM:dev] → ${fcmToken.slice(0, 20)}… | ${payload.title}: ${payload.body}`)
      return
    }

    try {
      await this.messaging.send({
        token: fcmToken,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data ?? {},
        android: {
          priority: 'high',
          notification: {
            channelId: 'alerts',
            priority: 'high',
          },
        },
      })
    } catch (e) {
      console.error('[FCM] Error enviando notificación:', e)
    }
  }
}
