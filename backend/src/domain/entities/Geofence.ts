export interface GeofenceProps {
  id: string
  deviceId: string
  name: string
  latitude: number
  longitude: number
  radiusMeters: number
  active: boolean
  createdAt: Date
}

export class Geofence {
  readonly id: string
  readonly deviceId: string
  readonly name: string
  readonly latitude: number
  readonly longitude: number
  readonly radiusMeters: number
  readonly active: boolean
  readonly createdAt: Date

  constructor(props: GeofenceProps) {
    this.id = props.id
    this.deviceId = props.deviceId
    this.name = props.name
    this.latitude = props.latitude
    this.longitude = props.longitude
    this.radiusMeters = props.radiusMeters
    this.active = props.active
    this.createdAt = props.createdAt
  }

  static create(props: Omit<GeofenceProps, 'active' | 'createdAt'>): Geofence {
    return new Geofence({ ...props, active: true, createdAt: new Date() })
  }

  /**
   * Calcula si un punto (lat, lng) está DENTRO de esta geofence.
   * Usa la fórmula de Haversine para distancia en metros.
   */
  contains(latitude: number, longitude: number): boolean {
    const R = 6371000 // Radio Tierra en metros
    const dLat = ((latitude - this.latitude) * Math.PI) / 180
    const dLon = ((longitude - this.longitude) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((this.latitude * Math.PI) / 180) *
        Math.cos((latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2
    const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return distance <= this.radiusMeters
  }
}
