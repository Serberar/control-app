import { AlertType } from '../../../domain/entities/Alert'
import { IAlertPreferencesRepository, AlertPreference } from '../../../domain/ports/repositories/IAlertPreferencesRepository'
import { query } from '../PostgreSQLConnection'

export class PostgreSQLAlertPreferencesRepository implements IAlertPreferencesRepository {
  // Si no hay fila para el tipo, la alerta está habilitada por defecto
  async isEnabled(deviceId: string, type: AlertType): Promise<boolean> {
    const rows = await query<{ enabled: boolean }>(
      `SELECT enabled FROM alert_preferences WHERE device_id = $1 AND alert_type = $2`,
      [deviceId, type],
    )
    return rows.length === 0 ? true : rows[0].enabled
  }

  async getAll(deviceId: string): Promise<AlertPreference[]> {
    const rows = await query<{ alert_type: string; enabled: boolean }>(
      `SELECT alert_type, enabled FROM alert_preferences WHERE device_id = $1`,
      [deviceId],
    )
    return rows.map((r) => ({ alertType: r.alert_type as AlertType, enabled: r.enabled }))
  }

  async setAll(deviceId: string, preferences: AlertPreference[]): Promise<void> {
    for (const pref of preferences) {
      await query(
        `INSERT INTO alert_preferences (id, device_id, alert_type, enabled, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, NOW())
         ON CONFLICT (device_id, alert_type) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = NOW()`,
        [deviceId, pref.alertType, pref.enabled],
      )
    }
  }
}
