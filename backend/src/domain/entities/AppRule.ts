import { randomUUID } from 'crypto'

export type RuleType = 'block' | 'time_limit'

export interface AppRuleData {
  id: string
  deviceId: string
  packageName: string
  appLabel: string
  ruleType: RuleType
  dailyLimitMinutes: number | null  // solo para time_limit
  isActive: boolean
  createdAt: Date
}

export class AppRule {
  id: string
  deviceId: string
  packageName: string
  appLabel: string
  ruleType: RuleType
  dailyLimitMinutes: number | null
  isActive: boolean
  createdAt: Date

  constructor(data: AppRuleData) {
    this.id = data.id
    this.deviceId = data.deviceId
    this.packageName = data.packageName
    this.appLabel = data.appLabel
    this.ruleType = data.ruleType
    this.dailyLimitMinutes = data.dailyLimitMinutes
    this.isActive = data.isActive
    this.createdAt = data.createdAt
  }

  static create(
    deviceId: string,
    packageName: string,
    appLabel: string,
    ruleType: RuleType,
    dailyLimitMinutes?: number,
  ): AppRule {
    return new AppRule({
      id: randomUUID(),
      deviceId,
      packageName,
      appLabel,
      ruleType,
      dailyLimitMinutes: dailyLimitMinutes ?? null,
      isActive: true,
      createdAt: new Date(),
    })
  }
}
