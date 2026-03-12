import { Device } from '../../../domain/entities/Device'
import { IDeviceRepository } from '../../../domain/ports/repositories/IDeviceRepository'
import { query, queryOne } from '../PostgreSQLConnection'

interface DeviceRow {
  id: string
  user_id: string
  name: string
  alias: string | null
  device_model: string | null
  android_version: string | null
  app_version: string | null
  device_token: string
  fcm_token: string | null
  last_seen_at: Date | null
  battery_level: number | null
  is_active: boolean
  created_at: Date
  updated_at: Date
}

function rowToDevice(row: DeviceRow): Device {
  return new Device({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    alias: row.alias,
    deviceModel: row.device_model,
    androidVersion: row.android_version,
    appVersion: row.app_version,
    deviceToken: row.device_token,
    fcmToken: row.fcm_token,
    lastSeenAt: row.last_seen_at,
    batteryLevel: row.battery_level,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })
}

export class PostgreSQLDeviceRepository implements IDeviceRepository {
  async findById(id: string): Promise<Device | null> {
    const row = await queryOne<DeviceRow>(
      'SELECT * FROM devices WHERE id = $1',
      [id],
    )
    return row ? rowToDevice(row) : null
  }

  async findByToken(deviceToken: string): Promise<Device | null> {
    const row = await queryOne<DeviceRow>(
      'SELECT * FROM devices WHERE device_token = $1',
      [deviceToken],
    )
    return row ? rowToDevice(row) : null
  }

  async findByUserId(userId: string): Promise<Device[]> {
    const rows = await query<DeviceRow>(
      'SELECT * FROM devices WHERE user_id = $1 AND is_active = true ORDER BY created_at ASC',
      [userId],
    )
    return rows.map(rowToDevice)
  }

  async findAllActive(): Promise<Device[]> {
    const rows = await query<DeviceRow>(
      'SELECT * FROM devices WHERE is_active = true',
      [],
    )
    return rows.map(rowToDevice)
  }

  async save(device: Device): Promise<void> {
    await query(
      `INSERT INTO devices (
        id, user_id, name, alias, device_model, android_version,
        app_version, device_token, fcm_token, last_seen_at,
        battery_level, is_active, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        alias = EXCLUDED.alias,
        app_version = EXCLUDED.app_version,
        updated_at = NOW()`,
      [
        device.id, device.userId, device.name, device.alias,
        device.deviceModel, device.androidVersion, device.appVersion,
        device.deviceToken, device.fcmToken, device.lastSeenAt,
        device.batteryLevel, device.isActive, device.createdAt, device.updatedAt,
      ],
    )
  }

  async updateHeartbeat(deviceId: string, batteryLevel: number | null, fcmToken: string | null): Promise<void> {
    await query(
      `UPDATE devices
       SET last_seen_at = NOW(), battery_level = $2, fcm_token = COALESCE($3, fcm_token), updated_at = NOW()
       WHERE id = $1`,
      [deviceId, batteryLevel, fcmToken],
    )
  }
}
