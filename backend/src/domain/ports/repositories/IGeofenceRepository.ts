import { Geofence } from '../../entities/Geofence'

export interface IGeofenceRepository {
  save(geofence: Geofence): Promise<void>
  findByDevice(deviceId: string): Promise<Geofence[]>
  findById(id: string): Promise<Geofence | null>
  delete(id: string): Promise<void>
  setActive(id: string, active: boolean): Promise<void>
}
