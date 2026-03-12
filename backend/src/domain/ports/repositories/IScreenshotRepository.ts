import { Screenshot } from '../../entities/Screenshot'

export interface IScreenshotRepository {
  save(screenshot: Screenshot): Promise<void>
  findByDevice(deviceId: string, limit: number, offset: number): Promise<Screenshot[]>
  findById(id: string): Promise<Screenshot | null>
  delete(id: string): Promise<void>
}
