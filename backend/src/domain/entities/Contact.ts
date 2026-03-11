export interface ContactProps {
  id: string
  deviceId: string
  name: string
  phoneNumbers: string[]
  emails: string[]
  syncedAt: Date
  createdAt: Date
}

export class Contact {
  readonly id: string
  readonly deviceId: string
  readonly name: string
  readonly phoneNumbers: string[]
  readonly emails: string[]
  readonly syncedAt: Date
  readonly createdAt: Date

  constructor(props: ContactProps) {
    this.id = props.id
    this.deviceId = props.deviceId
    this.name = props.name
    this.phoneNumbers = props.phoneNumbers
    this.emails = props.emails
    this.syncedAt = props.syncedAt
    this.createdAt = props.createdAt
  }

  static create(props: Omit<ContactProps, 'createdAt'>): Contact {
    return new Contact({ ...props, createdAt: new Date() })
  }
}
