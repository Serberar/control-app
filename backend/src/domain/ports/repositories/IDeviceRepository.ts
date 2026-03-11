import { Device } from '../../entities/Device'

export interface IDeviceRepository {
  findById(id: string): Promise<Device | null>
  findByToken(deviceToken: string): Promise<Device | null>
  findByUserId(userId: string): Promise<Device[]>
  save(device: Device): Promise<void>
  updateHeartbeat(deviceId: string, batteryLevel: number | null, fcmToken: string | null): Promise<void>
}
