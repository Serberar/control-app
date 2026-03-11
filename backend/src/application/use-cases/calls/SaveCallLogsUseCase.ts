import { v4 as uuidv4 } from 'uuid'
import { CallLog, CallSource, CallType } from '../../../domain/entities/CallLog'
import { ICallLogRepository } from '../../../domain/ports/repositories/ICallLogRepository'
import { Result } from '../../../shared/types/Result'

interface CallLogInput {
  source: CallSource
  contactName: string | null
  phoneNumber: string
  type: CallType
  durationSeconds: number
  timestamp: number // unix ms
}

interface SaveCallLogsInput {
  deviceId: string
  calls: CallLogInput[]
}

export class SaveCallLogsUseCase {
  constructor(private readonly callLogRepository: ICallLogRepository) {}

  async execute(input: SaveCallLogsInput): Promise<Result<number>> {
    const callLogs = input.calls.map((c) =>
      CallLog.create({
        id: uuidv4(),
        deviceId: input.deviceId,
        source: c.source,
        contactName: c.contactName,
        phoneNumber: c.phoneNumber,
        type: c.type,
        durationSeconds: c.durationSeconds,
        timestamp: new Date(c.timestamp),
      }),
    )

    await this.callLogRepository.saveBatch(callLogs)

    return Result.ok(callLogs.length)
  }
}
