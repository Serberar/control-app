export interface PushPayload {
  title: string
  body: string
  data?: Record<string, string>
}

export interface INotificationService {
  sendToToken(fcmToken: string, payload: PushPayload): Promise<void>
}
