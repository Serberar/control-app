import { Screenshot } from '../../../domain/entities/Screenshot'
import { IScreenshotRepository } from '../../../domain/ports/repositories/IScreenshotRepository'
import { query, queryOne } from '../PostgreSQLConnection'

interface ScreenshotRow {
  id: string
  device_id: string
  file_path: string
  size_bytes: string | null
  created_at: Date
}

function rowToScreenshot(row: ScreenshotRow): Screenshot {
  return new Screenshot({
    id: row.id,
    deviceId: row.device_id,
    filePath: row.file_path,
    sizeBytes: row.size_bytes !== null ? parseInt(row.size_bytes, 10) : null,
    createdAt: row.created_at,
  })
}

export class PostgreSQLScreenshotRepository implements IScreenshotRepository {
  async save(screenshot: Screenshot): Promise<void> {
    await query(
      `INSERT INTO screenshots (id, device_id, file_path, size_bytes, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [screenshot.id, screenshot.deviceId, screenshot.filePath, screenshot.sizeBytes, screenshot.createdAt],
    )
  }

  async findByDevice(deviceId: string, limit: number, offset: number): Promise<Screenshot[]> {
    const rows = await query<ScreenshotRow>(
      `SELECT * FROM screenshots WHERE device_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [deviceId, limit, offset],
    )
    return rows.map(rowToScreenshot)
  }

  async findById(id: string): Promise<Screenshot | null> {
    const row = await queryOne<ScreenshotRow>(`SELECT * FROM screenshots WHERE id = $1`, [id])
    return row ? rowToScreenshot(row) : null
  }

  async delete(id: string): Promise<void> {
    await query(`DELETE FROM screenshots WHERE id = $1`, [id])
  }
}
