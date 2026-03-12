import { Schedule } from '../../../domain/entities/Schedule'
import { IScheduleRepository } from '../../../domain/ports/repositories/IScheduleRepository'
import { query, queryOne } from '../PostgreSQLConnection'

interface ScheduleRow {
  id: string
  device_id: string
  name: string
  active_days: number
  start_time: string
  end_time: string
  is_active: boolean
  created_at: Date
}

function rowToSchedule(row: ScheduleRow): Schedule {
  return new Schedule({
    id: row.id,
    deviceId: row.device_id,
    name: row.name,
    activeDays: Number(row.active_days),
    startTime: row.start_time,
    endTime: row.end_time,
    isActive: row.is_active,
    createdAt: row.created_at,
  })
}

export class PostgreSQLScheduleRepository implements IScheduleRepository {
  async save(schedule: Schedule): Promise<void> {
    await query(
      `INSERT INTO schedules (id, device_id, name, active_days, start_time, end_time, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         name        = EXCLUDED.name,
         active_days = EXCLUDED.active_days,
         start_time  = EXCLUDED.start_time,
         end_time    = EXCLUDED.end_time,
         is_active   = EXCLUDED.is_active`,
      [schedule.id, schedule.deviceId, schedule.name, schedule.activeDays,
       schedule.startTime, schedule.endTime, schedule.isActive, schedule.createdAt],
    )
  }

  async findByDevice(deviceId: string): Promise<Schedule[]> {
    const rows = await query<ScheduleRow>(
      `SELECT * FROM schedules WHERE device_id = $1 ORDER BY created_at DESC`,
      [deviceId],
    )
    return rows.map(rowToSchedule)
  }

  async findActiveByDevice(deviceId: string): Promise<Schedule[]> {
    const rows = await query<ScheduleRow>(
      `SELECT * FROM schedules WHERE device_id = $1 AND is_active = true`,
      [deviceId],
    )
    return rows.map(rowToSchedule)
  }

  async findById(id: string): Promise<Schedule | null> {
    const row = await queryOne<ScheduleRow>(`SELECT * FROM schedules WHERE id = $1`, [id])
    return row ? rowToSchedule(row) : null
  }

  async delete(id: string): Promise<void> {
    await query(`DELETE FROM schedules WHERE id = $1`, [id])
  }

  async setActive(id: string, active: boolean): Promise<void> {
    await query(`UPDATE schedules SET is_active = $1 WHERE id = $2`, [active, id])
  }
}
