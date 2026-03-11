import { Keyword } from '../../entities/Keyword'

export interface IKeywordRepository {
  replaceAll(deviceId: string, keywords: Keyword[]): Promise<void>
  findByDevice(deviceId: string): Promise<Keyword[]>
}
