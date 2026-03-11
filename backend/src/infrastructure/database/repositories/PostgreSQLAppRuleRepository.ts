import { AppRule } from '../../../domain/entities/AppRule'
import { IAppRuleRepository } from '../../../domain/ports/repositories/IAppRuleRepository'
import { query, queryOne } from '../PostgreSQLConnection'

interface RuleRow {
  id: string
  device_id: string
  package_name: string
  app_label: string
  rule_type: 'block' | 'time_limit'
  daily_limit_minutes: string | null
  is_active: boolean
  created_at: Date
}

function rowToRule(row: RuleRow): AppRule {
  return new AppRule({
    id: row.id,
    deviceId: row.device_id,
    packageName: row.package_name,
    appLabel: row.app_label,
    ruleType: row.rule_type,
    dailyLimitMinutes: row.daily_limit_minutes !== null ? parseInt(row.daily_limit_minutes, 10) : null,
    isActive: row.is_active,
    createdAt: row.created_at,
  })
}

export class PostgreSQLAppRuleRepository implements IAppRuleRepository {
  async save(rule: AppRule): Promise<void> {
    await query(
      `INSERT INTO app_rules (id, device_id, package_name, app_label, rule_type, daily_limit_minutes, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         package_name        = EXCLUDED.package_name,
         app_label           = EXCLUDED.app_label,
         rule_type           = EXCLUDED.rule_type,
         daily_limit_minutes = EXCLUDED.daily_limit_minutes,
         is_active           = EXCLUDED.is_active`,
      [rule.id, rule.deviceId, rule.packageName, rule.appLabel, rule.ruleType, rule.dailyLimitMinutes, rule.isActive, rule.createdAt],
    )
  }

  async findByDevice(deviceId: string): Promise<AppRule[]> {
    const rows = await query<RuleRow>(
      `SELECT * FROM app_rules WHERE device_id = $1 ORDER BY created_at DESC`,
      [deviceId],
    )
    return rows.map(rowToRule)
  }

  async findById(id: string): Promise<AppRule | null> {
    const row = await queryOne<RuleRow>(`SELECT * FROM app_rules WHERE id = $1`, [id])
    return row ? rowToRule(row) : null
  }

  async delete(id: string): Promise<void> {
    await query(`DELETE FROM app_rules WHERE id = $1`, [id])
  }

  async setActive(id: string, active: boolean): Promise<void> {
    await query(`UPDATE app_rules SET is_active = $1 WHERE id = $2`, [active, id])
  }
}
