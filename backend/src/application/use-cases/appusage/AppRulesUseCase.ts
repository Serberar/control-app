import { AppRule, RuleType } from '../../../domain/entities/AppRule'
import { IAppRuleRepository } from '../../../domain/ports/repositories/IAppRuleRepository'

type Result<T> = { ok: true; value: T } | { ok: false; error: Error }

export class AppRulesUseCase {
  constructor(private readonly repo: IAppRuleRepository) {}

  async create(
    deviceId: string,
    packageName: string,
    appLabel: string,
    ruleType: RuleType,
    dailyLimitMinutes?: number,
  ): Promise<Result<AppRule>> {
    try {
      const rule = AppRule.create(deviceId, packageName, appLabel, ruleType, dailyLimitMinutes)
      await this.repo.save(rule)
      return { ok: true, value: rule }
    } catch (e) {
      return { ok: false, error: e as Error }
    }
  }

  async list(deviceId: string): Promise<Result<AppRule[]>> {
    try {
      const rules = await this.repo.findByDevice(deviceId)
      return { ok: true, value: rules }
    } catch (e) {
      return { ok: false, error: e as Error }
    }
  }

  async delete(id: string): Promise<Result<void>> {
    try {
      await this.repo.delete(id)
      return { ok: true, value: undefined }
    } catch (e) {
      return { ok: false, error: e as Error }
    }
  }

  async setActive(id: string, active: boolean): Promise<Result<void>> {
    try {
      await this.repo.setActive(id, active)
      return { ok: true, value: undefined }
    } catch (e) {
      return { ok: false, error: e as Error }
    }
  }
}
