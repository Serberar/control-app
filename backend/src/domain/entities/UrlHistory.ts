export interface UrlHistoryProps {
  id: string
  deviceId: string
  url: string
  title: string | null
  app: string | null
  createdAt: Date
}

export class UrlHistory {
  readonly id: string
  readonly deviceId: string
  readonly url: string
  readonly title: string | null
  readonly app: string | null
  readonly createdAt: Date

  constructor(props: UrlHistoryProps) {
    this.id = props.id
    this.deviceId = props.deviceId
    this.url = props.url
    this.title = props.title
    this.app = props.app
    this.createdAt = props.createdAt
  }

  static create(props: Omit<UrlHistoryProps, 'createdAt'>): UrlHistory {
    return new UrlHistory({ ...props, createdAt: new Date() })
  }
}
