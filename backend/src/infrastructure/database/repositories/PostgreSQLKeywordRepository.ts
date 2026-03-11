import { Keyword } from '../../../domain/entities/Keyword'
import { IKeywordRepository } from '../../../domain/ports/repositories/IKeywordRepository'
import { query } from '../PostgreSQLConnection'

interface KeywordRow {
  id: string
  device_id: string
  word: string
  created_at: Date
}

function rowToKeyword(row: KeywordRow): Keyword {
  return new Keyword({
    id: row.id,
    deviceId: row.device_id,
    word: row.word,
    createdAt: row.created_at,
  })
}

export class PostgreSQLKeywordRepository implements IKeywordRepository {
  async replaceAll(deviceId: string, keywords: Keyword[]): Promise<void> {
    // Reemplazar atómicamente
    await query('BEGIN', [])
    await query('DELETE FROM keywords WHERE device_id = $1', [deviceId])

    if (keywords.length > 0) {
      const values: unknown[] = []
      const placeholders = keywords.map((k, i) => {
        const base = i * 4
        values.push(k.id, k.deviceId, k.word, k.createdAt)
        return `($${base + 1},$${base + 2},$${base + 3},$${base + 4})`
      })
      await query(
        `INSERT INTO keywords (id, device_id, word, created_at) VALUES ${placeholders.join(',')}`,
        values,
      )
    }

    await query('COMMIT', [])
  }

  async findByDevice(deviceId: string): Promise<Keyword[]> {
    const rows = await query<KeywordRow>(
      'SELECT * FROM keywords WHERE device_id = $1 ORDER BY word ASC',
      [deviceId],
    )
    return rows.map(rowToKeyword)
  }
}
