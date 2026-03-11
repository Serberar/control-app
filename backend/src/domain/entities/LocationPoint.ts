export interface LocationPointProps {
  id: string
  deviceId: string
  latitude: number
  longitude: number
  accuracy: number | null
  altitude: number | null
  address: string | null
  createdAt: Date
}

export class LocationPoint {
  readonly id: string
  readonly deviceId: string
  readonly latitude: number
  readonly longitude: number
  readonly accuracy: number | null
  readonly altitude: number | null
  readonly address: string | null
  readonly createdAt: Date

  constructor(props: LocationPointProps) {
    this.id = props.id
    this.deviceId = props.deviceId
    this.latitude = props.latitude
    this.longitude = props.longitude
    this.accuracy = props.accuracy
    this.altitude = props.altitude
    this.address = props.address
    this.createdAt = props.createdAt
  }

  static create(props: Omit<LocationPointProps, 'createdAt'>): LocationPoint {
    return new LocationPoint({
      ...props,
      createdAt: new Date(),
    })
  }
}
