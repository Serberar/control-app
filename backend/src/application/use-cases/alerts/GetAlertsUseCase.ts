import { IAlertRepository, AlertFilter } from '../../../domain/ports/repositories/IAlertRepository'
import { Alert } from '../../../domain/entities/Alert'
import { Result } from '../../../shared/types/Result'

interface GetAlertsInput {
  deviceId: string
  unreadOnly?: boolean
  limit?: number
  offset?: number
}

export class GetAlertsUseCase {
  constructor(private readonly alertRepository: IAlertRepository) {}

  async execute(input: GetAlertsInput): Promise<Result<Alert[]>> {
    const filter: AlertFilter = {
      deviceId: input.deviceId,
      unreadOnly: input.unreadOnly,
      limit: input.limit ?? 100,
      offset: input.offset ?? 0,
    }
    const alerts = await this.alertRepository.findByDevice(filter)
    return Result.ok(alerts)
  }

  async markRead(alertId: string): Promise<Result<void>> {
    await this.alertRepository.markRead(alertId)
    return Result.ok(undefined)
  }

  async countUnread(deviceId: string): Promise<Result<number>> {
    const count = await this.alertRepository.countUnread(deviceId)
    return Result.ok(count)
  }
}
