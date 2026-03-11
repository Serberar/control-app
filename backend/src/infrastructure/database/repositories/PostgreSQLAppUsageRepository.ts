import { AppUsage } from '../../../domain/entities/AppUsage'
import { IAppUsageRepository } from '../../../domain/ports/repositories/IAppUsageRepository'
import { query, queryOne } from '../PostgreSQLConnection'

interface UsageRow {
  id: string
  device_id: string
  package_name: string
  app_label: string
  date: string
  total_minutes: string
  open_count: string
  last_used: Date
}

function rowToUsage(row: UsageRow): AppUsage {
  return new AppUsage({
    id: row.id,
    deviceId: row.device_id,
    packageName: row.package_name,
    appLabel: row.app_label,
    date: row.date,
    totalMinutes: parseInt(row.total_minutes, 10),
    openCount: parseInt(row.open_count, 10),
    lastUsed: row.last_used,
  })
}

export class PostgreSQLAppUsageRepository implements IAppUsageRepository {
  async upsert(usage: AppUsage): Promise<void> {
    await query(
      `INSERT INTO app_usage (id, device_id, package_name, app_label, date, total_minutes, open_count, last_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (device_id, package_name, date)
       DO UPDATE SET
         total_minutes = EXCLUDED.total_minutes,
         open_count    = EXCLUDED.open_count,
         last_used     = EXCLUDED.last_used,
         app_label     = EXCLUDED.app_label`,
      [usage.id, usage.deviceId, usage.packageName, usage.appLabel, usage.date, usage.totalMinutes, usage.openCount, usage.lastUsed],
    )
  }

  async upsertBatch(usages: AppUsage[]): Promise<void> {
    if (usages.length === 0) return
    for (const u of usages) {
      await this.upsert(u)
    }
  }

  async findByDevice(deviceId: string, from: string, to: string): Promise<AppUsage[]> {
    const rows = await query<UsageRow>(
      `SELECT * FROM app_usage
       WHERE device_id = $1 AND date >= $2 AND date <= $3
       ORDER BY date DESC, total_minutes DESC`,
      [deviceId, from, to],
    )
    return rows.map(rowToUsage)
  }

  async findTodayUsage(deviceId: string, packageName: string, date: string): Promise<AppUsage | null> {
    const row = await queryOne<UsageRow>(
      `SELECT * FROM app_usage WHERE device_id = $1 AND package_name = $2 AND date = $3`,
      [deviceId, packageName, date],
    )
    return row ? rowToUsage(row) : null
  }
}
