import { CallLog, CallSource, CallType } from '../../entities/CallLog'

export interface CallLogFilter {
  deviceId: string
  source?: CallSource
  type?: CallType
  from?: Date
  to?: Date
  limit?: number
}

export interface ICallLogRepository {
  save(callLog: CallLog): Promise<void>
  saveBatch(callLogs: CallLog[]): Promise<void>
  findByDevice(filter: CallLogFilter): Promise<CallLog[]>
}
