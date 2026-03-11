import { readFileSync } from 'fs'
import { join } from 'path'
import { getPool } from './PostgreSQLConnection'

export async function runMigrations(): Promise<void> {
  const pool = getPool()
  const client = await pool.connect()

  try {
    // Tabla de control de migraciones
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id         SERIAL PRIMARY KEY,
        filename   VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    const migrations = ['001_initial_schema.sql', '002_pairing_codes.sql']

    for (const filename of migrations) {
      const already = await client.query(
        'SELECT id FROM migrations WHERE filename = $1',
        [filename],
      )

      if (already.rowCount && already.rowCount > 0) {
        console.log(`[Migrate] Saltando ${filename} (ya aplicada)`)
        continue
      }

      console.log(`[Migrate] Aplicando ${filename}...`)
      const sql = readFileSync(
        join(__dirname, 'migrations', filename),
        'utf-8',
      )

      await client.query('BEGIN')
      await client.query(sql)
      await client.query('INSERT INTO migrations (filename) VALUES ($1)', [filename])
      await client.query('COMMIT')

      console.log(`[Migrate] ${filename} aplicada correctamente`)
    }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
