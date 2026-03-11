import { Contact } from '../../entities/Contact'

export interface IContactRepository {
  upsertBatch(contacts: Contact[]): Promise<void>
  findByDevice(deviceId: string): Promise<Contact[]>
  deleteByDevice(deviceId: string): Promise<void>
}
