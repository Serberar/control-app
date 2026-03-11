export interface KeywordProps {
  id: string
  deviceId: string
  word: string
  createdAt: Date
}

export class Keyword {
  readonly id: string
  readonly deviceId: string
  readonly word: string
  readonly createdAt: Date

  constructor(props: KeywordProps) {
    this.id = props.id
    this.deviceId = props.deviceId
    this.word = props.word
    this.createdAt = props.createdAt
  }

  static create(props: Omit<KeywordProps, 'createdAt'>): Keyword {
    return new Keyword({ ...props, createdAt: new Date() })
  }
}
