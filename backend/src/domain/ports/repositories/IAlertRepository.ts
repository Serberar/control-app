import { Alert, AlertType } from '../../entities/Alert'

export interface AlertFilter {
  deviceId: string
  unreadOnly?: boolean
  limit?: number
  offset?: number
}

export interface IAlertRepository {
  save(alert: Alert): Promise<void>
  findByDevice(filter: AlertFilter): Promise<Alert[]>
  markRead(alertId: string): Promise<void>
  countUnread(deviceId: string): Promise<number>
  hasRecentAlert(deviceId: string, type: AlertType, since: Date): Promise<boolean>
}
