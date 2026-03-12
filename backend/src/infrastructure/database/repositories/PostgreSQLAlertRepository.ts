import { Alert, AlertType, AlertSeverity } from '../../../domain/entities/Alert'
import { IAlertRepository, AlertFilter } from '../../../domain/ports/repositories/IAlertRepository'
import { query } from '../PostgreSQLConnection'

interface AlertRow {
  id: string
  device_id: string
  type: string
  severity: string
  title: string
  body: string
  metadata: Record<string, unknown> | null
  read_at: Date | null
  created_at: Date
}

function rowToAlert(row: AlertRow): Alert {
  return new Alert({
    id: row.id,
    deviceId: row.device_id,
    type: row.type as AlertType,
    severity: row.severity as AlertSeverity,
    title: row.title,
    body: row.body,
    metadata: row.metadata,
    readAt: row.read_at,
    createdAt: row.created_at,
  })
}

export class PostgreSQLAlertRepository implements IAlertRepository {
  async save(alert: Alert): Promise<void> {
    await query(
      `INSERT INTO alerts (id, device_id, type, severity, title, body, metadata, read_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO NOTHING`,
      [
        alert.id,
        alert.deviceId,
        alert.type,
        alert.severity,
        alert.title,
        alert.body,
        alert.metadata ? JSON.stringify(alert.metadata) : null,
        alert.readAt,
        alert.createdAt,
      ],
    )
  }

  async findByDevice(filter: AlertFilter): Promise<Alert[]> {
    const conditions = ['device_id = $1']
    const params: unknown[] = [filter.deviceId]
    let idx = 2

    if (filter.unreadOnly) {
      conditions.push('read_at IS NULL')
    }

    const limit = filter.limit ?? 100
    const offset = filter.offset ?? 0
    params.push(limit, offset)

    const rows = await query<AlertRow>(
      `SELECT * FROM alerts WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params,
    )
    return rows.map(rowToAlert)
  }

  async markRead(alertId: string): Promise<void> {
    await query(`UPDATE alerts SET read_at = NOW() WHERE id = $1`, [alertId])
  }

  async countUnread(deviceId: string): Promise<number> {
    const rows = await query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM alerts WHERE device_id = $1 AND read_at IS NULL`,
      [deviceId],
    )
    return parseInt(rows[0]?.count ?? '0', 10)
  }

  async hasRecentAlert(deviceId: string, type: AlertType, since: Date): Promise<boolean> {
    const rows = await query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM alerts WHERE device_id = $1 AND type = $2 AND created_at >= $3`,
      [deviceId, type, since],
    )
    return parseInt(rows[0]?.count ?? '0', 10) > 0
  }
}
