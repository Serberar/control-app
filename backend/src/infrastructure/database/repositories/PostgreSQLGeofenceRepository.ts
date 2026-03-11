import { Geofence } from '../../../domain/entities/Geofence'
import { IGeofenceRepository } from '../../../domain/ports/repositories/IGeofenceRepository'
import { query, queryOne } from '../PostgreSQLConnection'

interface GeofenceRow {
  id: string
  device_id: string
  name: string
  latitude: number
  longitude: number
  radius_meters: number
  active: boolean
  created_at: Date
}

function rowToGeofence(row: GeofenceRow): Geofence {
  return new Geofence({
    id: row.id,
    deviceId: row.device_id,
    name: row.name,
    latitude: parseFloat(row.latitude as unknown as string),
    longitude: parseFloat(row.longitude as unknown as string),
    radiusMeters: parseFloat(row.radius_meters as unknown as string),
    active: row.active,
    createdAt: row.created_at,
  })
}

export class PostgreSQLGeofenceRepository implements IGeofenceRepository {
  async save(geofence: Geofence): Promise<void> {
    await query(
      `INSERT INTO geofences (id, device_id, name, latitude, longitude, radius_meters, active, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         radius_meters = EXCLUDED.radius_meters,
         active = EXCLUDED.active`,
      [
        geofence.id,
        geofence.deviceId,
        geofence.name,
        geofence.latitude,
        geofence.longitude,
        geofence.radiusMeters,
        geofence.active,
        geofence.createdAt,
      ],
    )
  }

  async findByDevice(deviceId: string): Promise<Geofence[]> {
    const rows = await query<GeofenceRow>(
      'SELECT * FROM geofences WHERE device_id = $1 ORDER BY created_at DESC',
      [deviceId],
    )
    return rows.map(rowToGeofence)
  }

  async findById(id: string): Promise<Geofence | null> {
    const row = await queryOne<GeofenceRow>('SELECT * FROM geofences WHERE id = $1', [id])
    return row ? rowToGeofence(row) : null
  }

  async delete(id: string): Promise<void> {
    await query('DELETE FROM geofences WHERE id = $1', [id])
  }

  async setActive(id: string, active: boolean): Promise<void> {
    await query('UPDATE geofences SET active = $1 WHERE id = $2', [active, id])
  }
}
