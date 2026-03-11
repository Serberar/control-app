import { Contact } from '../../../domain/entities/Contact'
import { IContactRepository } from '../../../domain/ports/repositories/IContactRepository'
import { query } from '../PostgreSQLConnection'

interface ContactRow {
  id: string
  device_id: string
  name: string
  phone_numbers: string[]
  emails: string[]
  synced_at: Date
  created_at: Date
}

function rowToContact(row: ContactRow): Contact {
  return new Contact({
    id: row.id,
    deviceId: row.device_id,
    name: row.name,
    phoneNumbers: row.phone_numbers,
    emails: row.emails,
    syncedAt: row.synced_at,
    createdAt: row.created_at,
  })
}

export class PostgreSQLContactRepository implements IContactRepository {
  async upsertBatch(contacts: Contact[]): Promise<void> {
    if (contacts.length === 0) return

    const values: unknown[] = []
    const placeholders = contacts.map((c, i) => {
      const base = i * 7
      values.push(
        c.id, c.deviceId, c.name,
        JSON.stringify(c.phoneNumbers),
        JSON.stringify(c.emails),
        c.syncedAt, c.createdAt,
      )
      return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7})`
    })

    await query(
      `INSERT INTO contacts (id, device_id, name, phone_numbers, emails, synced_at, created_at)
       VALUES ${placeholders.join(',')}
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, phone_numbers = EXCLUDED.phone_numbers,
         emails = EXCLUDED.emails, synced_at = EXCLUDED.synced_at`,
      values,
    )
  }

  async findByDevice(deviceId: string): Promise<Contact[]> {
    const rows = await query<ContactRow>(
      `SELECT * FROM contacts WHERE device_id = $1 ORDER BY name ASC`,
      [deviceId],
    )
    return rows.map(rowToContact)
  }

  async deleteByDevice(deviceId: string): Promise<void> {
    await query(`DELETE FROM contacts WHERE device_id = $1`, [deviceId])
  }
}
