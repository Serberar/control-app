import { LocationPoint } from '../../../domain/entities/LocationPoint'
import { ILocationRepository, LocationHistoryFilter } from '../../../domain/ports/repositories/ILocationRepository'
import { query, queryOne } from '../PostgreSQLConnection'

interface LocationRow {
  id: string
  device_id: string
  latitude: string
  longitude: string
  accuracy: string | null
  altitude: string | null
  address: string | null
  created_at: Date
}

function rowToPoint(row: LocationRow): LocationPoint {
  return new LocationPoint({
    id: row.id,
    deviceId: row.device_id,
    latitude: parseFloat(row.latitude),
    longitude: parseFloat(row.longitude),
    accuracy: row.accuracy ? parseFloat(row.accuracy) : null,
    altitude: row.altitude ? parseFloat(row.altitude) : null,
    address: row.address,
    createdAt: row.created_at,
  })
}

export class PostgreSQLLocationRepository implements ILocationRepository {
  async save(point: LocationPoint): Promise<void> {
    await query(
      `INSERT INTO location_history (id, device_id, latitude, longitude, accuracy, altitude, address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [point.id, point.deviceId, point.latitude, point.longitude, point.accuracy, point.altitude, point.address, point.createdAt],
    )
  }

  async findHistory(filter: LocationHistoryFilter): Promise<LocationPoint[]> {
    const rows = await query<LocationRow>(
      `SELECT * FROM location_history
       WHERE device_id = $1 AND created_at BETWEEN $2 AND $3
       ORDER BY created_at ASC`,
      [filter.deviceId, filter.from, filter.to],
    )
    return rows.map(rowToPoint)
  }

  async findLatest(deviceId: string): Promise<LocationPoint | null> {
    const row = await queryOne<LocationRow>(
      `SELECT * FROM location_history
       WHERE device_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [deviceId],
    )
    return row ? rowToPoint(row) : null
  }
}
