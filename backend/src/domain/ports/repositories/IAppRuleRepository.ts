import { AppRule } from '../../entities/AppRule'

export interface IAppRuleRepository {
  save(rule: AppRule): Promise<void>
  findByDevice(deviceId: string): Promise<AppRule[]>
  findById(id: string): Promise<AppRule | null>
  delete(id: string): Promise<void>
  setActive(id: string, active: boolean): Promise<void>
}
