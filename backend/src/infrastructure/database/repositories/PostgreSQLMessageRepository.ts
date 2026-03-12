import { Message, MessageApp, MessageDirection } from '../../../domain/entities/Message'
import { IMessageRepository, MessageFilter, ConversationFilter, ConversationSummary } from '../../../domain/ports/repositories/IMessageRepository'
import { query, queryOne } from '../PostgreSQLConnection'

interface MessageRow {
  id: string
  device_id: string
  app: MessageApp
  contact_name: string | null
  contact_identifier: string
  direction: MessageDirection
  body: string
  timestamp: Date
  thread_id: string | null
  created_at: Date
}

function rowToMessage(row: MessageRow): Message {
  return new Message({
    id: row.id,
    deviceId: row.device_id,
    app: row.app,
    contactName: row.contact_name,
    contactIdentifier: row.contact_identifier,
    direction: row.direction,
    body: row.body,
    timestamp: row.timestamp,
    threadId: row.thread_id,
    createdAt: row.created_at,
  })
}

export class PostgreSQLMessageRepository implements IMessageRepository {
  async save(message: Message): Promise<void> {
    await query(
      `INSERT INTO messages (id, device_id, app, contact_name, contact_identifier, direction, body, timestamp, thread_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO NOTHING`,
      [
        message.id, message.deviceId, message.app,
        message.contactName, message.contactIdentifier,
        message.direction, message.body, message.timestamp,
        message.threadId, message.createdAt,
      ],
    )
  }

  async saveBatch(messages: Message[]): Promise<void> {
    if (messages.length === 0) return

    // Build multi-row insert
    const values: unknown[] = []
    const placeholders = messages.map((m, i) => {
      const base = i * 10
      values.push(
        m.id, m.deviceId, m.app,
        m.contactName, m.contactIdentifier,
        m.direction, m.body, m.timestamp,
        m.threadId, m.createdAt,
      )
      return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9},$${base + 10})`
    })

    await query(
      `INSERT INTO messages (id, device_id, app, contact_name, contact_identifier, direction, body, timestamp, thread_id, created_at)
       VALUES ${placeholders.join(',')}
       ON CONFLICT (id) DO NOTHING`,
      values,
    )
  }

  async findByDevice(filter: MessageFilter): Promise<Message[]> {
    const conditions = ['device_id = $1']
    const params: unknown[] = [filter.deviceId]
    let idx = 2

    if (filter.app) {
      conditions.push(`app = $${idx++}`)
      params.push(filter.app)
    }
    if (filter.contactIdentifier) {
      conditions.push(`contact_identifier = $${idx++}`)
      params.push(filter.contactIdentifier)
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

    const rows = await query<MessageRow>(
      `SELECT * FROM messages WHERE ${conditions.join(' AND ')} ORDER BY timestamp DESC LIMIT $${idx}`,
      params,
    )
    return rows.map(rowToMessage)
  }

  async findConversations(filter: ConversationFilter): Promise<ConversationSummary[]> {
    const conditions = ['device_id = $1']
    const params: unknown[] = [filter.deviceId]
    let idx = 2

    if (filter.app) {
      conditions.push(`app = $${idx++}`)
      params.push(filter.app)
    }
    if (filter.from) {
      conditions.push(`timestamp >= $${idx++}`)
      params.push(filter.from)
    }
    if (filter.to) {
      conditions.push(`timestamp <= $${idx++}`)
      params.push(filter.to)
    }

    const where = conditions.join(' AND ')

    const rows = await query<{
      app: MessageApp
      contact_name: string | null
      contact_identifier: string
      last_message: string
      last_message_at: Date
      unread_count: string
    }>(
      `SELECT
         app,
         contact_name,
         contact_identifier,
         (SELECT body FROM messages m2
          WHERE m2.device_id = m.device_id
            AND m2.app = m.app
            AND m2.contact_identifier = m.contact_identifier
          ORDER BY timestamp DESC LIMIT 1) AS last_message,
         MAX(timestamp) AS last_message_at,
         COUNT(*) FILTER (WHERE direction = 'incoming') AS unread_count
       FROM messages m
       WHERE ${where}
       GROUP BY app, contact_name, contact_identifier, device_id
       ORDER BY last_message_at DESC`,
      params,
    )

    return rows.map((r) => ({
      app: r.app,
      contactName: r.contact_name,
      contactIdentifier: r.contact_identifier,
      lastMessage: r.last_message,
      lastMessageAt: r.last_message_at,
      unreadCount: parseInt(r.unread_count, 10),
    }))
  }

  async countSince(deviceId: string, since: Date): Promise<number> {
    const rows = await query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM messages WHERE device_id = $1 AND created_at >= $2`,
      [deviceId, since],
    )
    return parseInt(rows[0]?.count ?? '0', 10)
  }
}
