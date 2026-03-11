export interface DeviceProps {
  id: string
  userId: string
  name: string
  alias: string | null
  deviceModel: string | null
  androidVersion: string | null
  appVersion: string | null
  deviceToken: string
  fcmToken: string | null
  lastSeenAt: Date | null
  batteryLevel: number | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export class Device {
  readonly id: string
  readonly userId: string
  readonly name: string
  readonly alias: string | null
  readonly deviceModel: string | null
  readonly androidVersion: string | null
  readonly appVersion: string | null
  readonly deviceToken: string
  readonly fcmToken: string | null
  readonly lastSeenAt: Date | null
  readonly batteryLevel: number | null
  readonly isActive: boolean
  readonly createdAt: Date
  readonly updatedAt: Date

  constructor(props: DeviceProps) {
    this.id = props.id
    this.userId = props.userId
    this.name = props.name
    this.alias = props.alias
    this.deviceModel = props.deviceModel
    this.androidVersion = props.androidVersion
    this.appVersion = props.appVersion
    this.deviceToken = props.deviceToken
    this.fcmToken = props.fcmToken
    this.lastSeenAt = props.lastSeenAt
    this.batteryLevel = props.batteryLevel
    this.isActive = props.isActive
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
  }

  static create(props: Omit<DeviceProps, 'lastSeenAt' | 'batteryLevel' | 'fcmToken' | 'isActive' | 'createdAt' | 'updatedAt'>): Device {
    return new Device({
      ...props,
      fcmToken: null,
      lastSeenAt: null,
      batteryLevel: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }
}
