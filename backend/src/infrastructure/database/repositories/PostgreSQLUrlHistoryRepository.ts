import { UrlHistory } from '../../../domain/entities/UrlHistory'
import { IUrlHistoryRepository, UrlHistoryFilter, DomainStat } from '../../../domain/ports/repositories/IUrlHistoryRepository'
import { query } from '../PostgreSQLConnection'

interface UrlRow {
  id: string
  device_id: string
  url: string
  title: string | null
  app: string | null
  created_at: Date
}

function rowToUrl(row: UrlRow): UrlHistory {
  return new UrlHistory({
    id: row.id,
    deviceId: row.device_id,
    url: row.url,
    title: row.title,
    app: row.app,
    createdAt: row.created_at,
  })
}

export class PostgreSQLUrlHistoryRepository implements IUrlHistoryRepository {
  async saveBatch(entries: UrlHistory[]): Promise<void> {
    if (entries.length === 0) return

    const values: unknown[] = []
    const placeholders = entries.map((e, i) => {
      const base = i * 5
      values.push(e.id, e.deviceId, e.url, e.title, e.app)
      return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},NOW())`
    })

    await query(
      `INSERT INTO url_history (id, device_id, url, title, app, created_at)
       VALUES ${placeholders.join(',')}
       ON CONFLICT (id) DO NOTHING`,
      values,
    )
  }

  async findByDevice(filter: UrlHistoryFilter): Promise<UrlHistory[]> {
    const conditions = ['device_id = $1']
    const params: unknown[] = [filter.deviceId]
    let idx = 2

    if (filter.domain) {
      conditions.push(`url ILIKE $${idx++}`)
      params.push(`%${filter.domain}%`)
    }
    if (filter.from) {
      conditions.push(`created_at >= $${idx++}`)
      params.push(filter.from)
    }
    if (filter.to) {
      conditions.push(`created_at <= $${idx++}`)
      params.push(filter.to)
    }

    const limit = filter.limit ?? 100
    const offset = filter.offset ?? 0
    params.push(limit, offset)

    const rows = await query<UrlRow>(
      `SELECT * FROM url_history WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params,
    )
    return rows.map(rowToUrl)
  }

  async findTopDomains(deviceId: string, limit = 20): Promise<DomainStat[]> {
    // Extraer dominio con regexp de PostgreSQL
    const rows = await query<{ domain: string; visits: string; last_visit: Date }>(
      `SELECT
         regexp_replace(
           regexp_replace(url, '^https?://', ''),
           '/.*$', ''
         ) AS domain,
         COUNT(*) AS visits,
         MAX(created_at) AS last_visit
       FROM url_history
       WHERE device_id = $1
       GROUP BY domain
       ORDER BY visits DESC
       LIMIT $2`,
      [deviceId, limit],
    )

    return rows.map((r) => ({
      domain: r.domain,
      visits: parseInt(r.visits, 10),
      lastVisit: r.last_visit,
    }))
  }
}
