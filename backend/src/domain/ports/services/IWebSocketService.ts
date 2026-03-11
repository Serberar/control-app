export type WebSocketEvent =
  | 'location:request_now'
  | 'location:start_live'
  | 'location:stop_live'
  | 'device:lock'
  | 'device:unlock'

export interface IWebSocketService {
  // Al dispositivo hijo
  sendToDevice(deviceId: string, event: WebSocketEvent, payload?: unknown): boolean
  isDeviceConnected(deviceId: string): boolean
  onDeviceConnect(callback: (deviceId: string) => void): void
  onDeviceDisconnect(callback: (deviceId: string) => void): void

  // Al padre: reenvía ubicación en tiempo real para el modo live
  broadcastLocationToParent(userId: string, deviceId: string, point: unknown): void
}
