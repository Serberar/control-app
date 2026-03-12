import { AlertType } from '../../entities/Alert'

export interface AlertPreference {
  alertType: AlertType
  enabled: boolean
}

export interface IAlertPreferencesRepository {
  isEnabled(deviceId: string, type: AlertType): Promise<boolean>
  getAll(deviceId: string): Promise<AlertPreference[]>
  setAll(deviceId: string, preferences: AlertPreference[]): Promise<void>
}
