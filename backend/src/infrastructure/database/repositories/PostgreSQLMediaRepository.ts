import { Media, MediaType } from '../../../domain/entities/Media'
import { IMediaRepository, MediaFilter } from '../../../domain/ports/repositories/IMediaRepository'
import { query, queryOne } from '../PostgreSQLConnection'

interface MediaRow {
  id: string
  device_id: string
  file_path: string
  thumbnail_path: string | null
  file_type: MediaType
  file_size_bytes: string | null
  thumbnail_uploaded: boolean
  full_uploaded: boolean
  taken_at: Date | null
  created_at: Date
}

function rowToMedia(row: MediaRow): Media {
  return new Media({
    id: row.id,
    deviceId: row.device_id,
    filePath: row.file_path,
    thumbnailPath: row.thumbnail_path,
    fileType: row.file_type,
    fileSizeBytes: row.file_size_bytes ? parseInt(row.file_size_bytes, 10) : null,
    thumbnailUploaded: row.thumbnail_uploaded,
    fullUploaded: row.full_uploaded,
    takenAt: row.taken_at,
    createdAt: row.created_at,
  })
}

export class PostgreSQLMediaRepository implements IMediaRepository {
  async save(media: Media): Promise<void> {
    await query(
      `INSERT INTO media (id, device_id, file_path, thumbnail_path, file_type, file_size_bytes,
        thumbnail_uploaded, full_uploaded, taken_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO NOTHING`,
      [
        media.id, media.deviceId, media.filePath, media.thumbnailPath,
        media.fileType, media.fileSizeBytes, media.thumbnailUploaded,
        media.fullUploaded, media.takenAt, media.createdAt,
      ],
    )
  }

  async markThumbnailUploaded(id: string): Promise<void> {
    await query(`UPDATE media SET thumbnail_uploaded = true WHERE id = $1`, [id])
  }

  async markFullUploaded(id: string): Promise<void> {
    await query(
      `UPDATE media SET full_uploaded = true, file_size_bytes = (
        SELECT COALESCE(file_size_bytes, 0) FROM media WHERE id = $1
       ) WHERE id = $1`,
      [id],
    )
  }

  async findByDevice(filter: MediaFilter): Promise<Media[]> {
    const conditions = ['device_id = $1']
    const params: unknown[] = [filter.deviceId]
    let idx = 2

    if (filter.fileType) {
      conditions.push(`file_type = $${idx++}`)
      params.push(filter.fileType)
    }
    if (filter.from) {
      conditions.push(`taken_at >= $${idx++}`)
      params.push(filter.from)
    }
    if (filter.to) {
      conditions.push(`taken_at <= $${idx++}`)
      params.push(filter.to)
    }

    const limit = filter.limit ?? 50
    const offset = filter.offset ?? 0
    params.push(limit, offset)

    const rows = await query<MediaRow>(
      `SELECT * FROM media WHERE ${conditions.join(' AND ')}
       ORDER BY COALESCE(taken_at, created_at) DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params,
    )
    return rows.map(rowToMedia)
  }

  async findById(id: string): Promise<Media | null> {
    const row = await queryOne<MediaRow>(`SELECT * FROM media WHERE id = $1`, [id])
    return row ? rowToMedia(row) : null
  }

  async countSince(deviceId: string, since: Date): Promise<number> {
    const rows = await query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM media WHERE device_id = $1 AND created_at >= $2`,
      [deviceId, since],
    )
    return parseInt(rows[0]?.count ?? '0', 10)
  }
}
