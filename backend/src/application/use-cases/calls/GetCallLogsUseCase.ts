import { ICallLogRepository, CallLogFilter } from '../../../domain/ports/repositories/ICallLogRepository'
import { CallLog, CallSource, CallType } from '../../../domain/entities/CallLog'
import { Result } from '../../../shared/types/Result'

interface GetCallLogsInput {
  deviceId: string
  source?: CallSource
  type?: CallType
  from?: Date
  to?: Date
  limit?: number
}

export class GetCallLogsUseCase {
  constructor(private readonly callLogRepository: ICallLogRepository) {}

  async execute(input: GetCallLogsInput): Promise<Result<CallLog[]>> {
    const filter: CallLogFilter = {
      deviceId: input.deviceId,
      source: input.source,
      type: input.type,
      from: input.from,
      to: input.to,
      limit: input.limit ?? 100,
    }
    const calls = await this.callLogRepository.findByDevice(filter)
    return Result.ok(calls)
  }
}
