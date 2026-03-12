import { Schedule } from '../../entities/Schedule'

export interface IScheduleRepository {
  save(schedule: Schedule): Promise<void>
  findByDevice(deviceId: string): Promise<Schedule[]>
  findActiveByDevice(deviceId: string): Promise<Schedule[]>
  findById(id: string): Promise<Schedule | null>
  delete(id: string): Promise<void>
  setActive(id: string, active: boolean): Promise<void>
}
