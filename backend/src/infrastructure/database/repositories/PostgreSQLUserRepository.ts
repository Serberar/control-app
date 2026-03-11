import { User } from '../../../domain/entities/User'
import { IUserRepository } from '../../../domain/ports/repositories/IUserRepository'
import { query, queryOne } from '../PostgreSQLConnection'

interface UserRow {
  id: string
  email: string
  password_hash: string
  name: string
  fcm_token: string | null
  created_at: Date
  updated_at: Date
}

function rowToUser(row: UserRow): User {
  return new User({
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    name: row.name,
    fcmToken: row.fcm_token ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })
}

export class PostgreSQLUserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    const row = await queryOne<UserRow>(
      'SELECT * FROM users WHERE id = $1',
      [id],
    )
    return row ? rowToUser(row) : null
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await queryOne<UserRow>(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()],
    )
    return row ? rowToUser(row) : null
  }

  async save(user: User): Promise<void> {
    await query(
      `INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email,
         password_hash = EXCLUDED.password_hash,
         name = EXCLUDED.name,
         updated_at = NOW()`,
      [user.id, user.email.toLowerCase(), user.passwordHash, user.name, user.createdAt, user.updatedAt],
    )
  }

  async updateFcmToken(userId: string, fcmToken: string | null): Promise<void> {
    await query(
      `UPDATE users SET fcm_token = $1, updated_at = NOW() WHERE id = $2`,
      [fcmToken, userId],
    )
  }
}
