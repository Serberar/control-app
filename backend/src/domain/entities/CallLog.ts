export type CallType = 'incoming' | 'outgoing' | 'missed'
export type CallSource = 'native' | 'whatsapp' | 'telegram'

export interface CallLogProps {
  id: string
  deviceId: string
  source: CallSource
  contactName: string | null
  phoneNumber: string
  type: CallType
  durationSeconds: number
  timestamp: Date
  createdAt: Date
}

export class CallLog {
  readonly id: string
  readonly deviceId: string
  readonly source: CallSource
  readonly contactName: string | null
  readonly phoneNumber: string
  readonly type: CallType
  readonly durationSeconds: number
  readonly timestamp: Date
  readonly createdAt: Date

  constructor(props: CallLogProps) {
    this.id = props.id
    this.deviceId = props.deviceId
    this.source = props.source
    this.contactName = props.contactName
    this.phoneNumber = props.phoneNumber
    this.type = props.type
    this.durationSeconds = props.durationSeconds
    this.timestamp = props.timestamp
    this.createdAt = props.createdAt
  }

  static create(props: Omit<CallLogProps, 'createdAt'>): CallLog {
    return new CallLog({ ...props, createdAt: new Date() })
  }
}
