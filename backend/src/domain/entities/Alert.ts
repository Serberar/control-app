export type AlertType =
  | 'keyword_match'
  | 'vpn_detected'
  | 'sim_change'
  | 'new_app_installed'
  | 'geofence_exit'

export type AlertSeverity = 'info' | 'warning' | 'critical'

export interface AlertProps {
  id: string
  deviceId: string
  type: AlertType
  severity: AlertSeverity
  title: string
  body: string
  metadata: Record<string, unknown> | null
  readAt: Date | null
  createdAt: Date
}

export class Alert {
  readonly id: string
  readonly deviceId: string
  readonly type: AlertType
  readonly severity: AlertSeverity
  readonly title: string
  readonly body: string
  readonly metadata: Record<string, unknown> | null
  readonly readAt: Date | null
  readonly createdAt: Date

  constructor(props: AlertProps) {
    this.id = props.id
    this.deviceId = props.deviceId
    this.type = props.type
    this.severity = props.severity
    this.title = props.title
    this.body = props.body
    this.metadata = props.metadata
    this.readAt = props.readAt
    this.createdAt = props.createdAt
  }

  static create(props: Omit<AlertProps, 'readAt' | 'createdAt'>): Alert {
    return new Alert({ ...props, readAt: null, createdAt: new Date() })
  }
}
