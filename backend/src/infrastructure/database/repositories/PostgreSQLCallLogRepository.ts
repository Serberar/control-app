import { CallLog, CallSource, CallType } from '../../../domain/entities/CallLog'
import { ICallLogRepository, CallLogFilter } from '../../../domain/ports/repositories/ICallLogRepository'
import { query } from '../PostgreSQLConnection'

interface CallLogRow {
  id: string
  device_id: string
  source: CallSource
  contact_name: string | null
  phone_number: string
  type: CallType
  duration_seconds: number
  timestamp: Date
  created_at: Date
}

function rowToCallLog(row: CallLogRow): CallLog {
  return new CallLog({
    id: row.id,
    deviceId: row.device_id,
    source: row.source,
    contactName: row.contact_name,
    phoneNumber: row.phone_number,
    type: row.type,
    durationSeconds: row.duration_seconds,
    timestamp: row.timestamp,
    createdAt: row.created_at,
  })
}

export class PostgreSQLCallLogRepository implements ICallLogRepository {
  async save(callLog: CallLog): Promise<void> {
    await query(
      `INSERT INTO call_logs (id, device_id, source, contact_name, phone_number, type, duration_seconds, timestamp, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO NOTHING`,
      [
        callLog.id, callLog.deviceId, callLog.source,
        callLog.contactName, callLog.phoneNumber, callLog.type,
        callLog.durationSeconds, callLog.timestamp, callLog.createdAt,
      ],
    )
  }

  async saveBatch(callLogs: CallLog[]): Promise<void> {
    if (callLogs.length === 0) return

    const values: unknown[] = []
    const placeholders = callLogs.map((c, i) => {
      const base = i * 9
      values.push(
        c.id, c.deviceId, c.source,
        c.contactName, c.phoneNumber, c.type,
        c.durationSeconds, c.timestamp, c.createdAt,
      )
      return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9})`
    })

    await query(
      `INSERT INTO call_logs (id, device_id, source, contact_name, phone_number, type, duration_seconds, timestamp, created_at)
       VALUES ${placeholders.join(',')}
       ON CONFLICT (id) DO NOTHING`,
      values,
    )
  }

  async findByDevice(filter: CallLogFilter): Promise<CallLog[]> {
    const conditions = ['device_id = $1']
    const params: unknown[] = [filter.deviceId]
    let idx = 2

    if (filter.source) {
      conditions.push(`source = $${idx++}`)
      params.push(filter.source)
    }
    if (filter.type) {
      conditions.push(`type = $${idx++}`)
      params.push(filter.type)
    }
    if (filter.from) {
      conditions.push(`timestamp >= $${idx++}`)
      params.push(filter.from)
    }
    if (filter.to) {
      conditions.push(`timestamp <= $${idx++}`)
      params.push(filter.to)
    }

    const limit = filter.limit ?? 100
    params.push(limit)

    const rows = await query<CallLogRow>(
      `SELECT * FROM call_logs WHERE ${conditions.join(' AND ')} ORDER BY timestamp DESC LIMIT $${idx}`,
      params,
    )
    return rows.map(rowToCallLog)
  }
}
