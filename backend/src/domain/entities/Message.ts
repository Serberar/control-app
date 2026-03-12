export type MessageApp = 'whatsapp' | 'telegram' | 'instagram' | 'sms' | 'teams'
export type MessageDirection = 'incoming' | 'outgoing'

export interface MessageProps {
  id: string
  deviceId: string
  app: MessageApp
  contactName: string | null
  contactIdentifier: string // phone, username, etc.
  direction: MessageDirection
  body: string
  timestamp: Date
  threadId: string | null
  createdAt: Date
}

export class Message {
  readonly id: string
  readonly deviceId: string
  readonly app: MessageApp
  readonly contactName: string | null
  readonly contactIdentifier: string
  readonly direction: MessageDirection
  readonly body: string
  readonly timestamp: Date
  readonly threadId: string | null
  readonly createdAt: Date

  constructor(props: MessageProps) {
    this.id = props.id
    this.deviceId = props.deviceId
    this.app = props.app
    this.contactName = props.contactName
    this.contactIdentifier = props.contactIdentifier
    this.direction = props.direction
    this.body = props.body
    this.timestamp = props.timestamp
    this.threadId = props.threadId
    this.createdAt = props.createdAt
  }

  static create(props: Omit<MessageProps, 'createdAt'>): Message {
    return new Message({ ...props, createdAt: new Date() })
  }
}
