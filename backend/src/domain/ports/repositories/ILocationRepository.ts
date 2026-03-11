import { LocationPoint } from '../../entities/LocationPoint'

export interface LocationHistoryFilter {
  deviceId: string
  from: Date
  to: Date
}

export interface ILocationRepository {
  save(point: LocationPoint): Promise<void>
  findHistory(filter: LocationHistoryFilter): Promise<LocationPoint[]>
  findLatest(deviceId: string): Promise<LocationPoint | null>
}
