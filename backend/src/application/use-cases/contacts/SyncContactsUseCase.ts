import { v4 as uuidv4 } from 'uuid'
import { Contact } from '../../../domain/entities/Contact'
import { IContactRepository } from '../../../domain/ports/repositories/IContactRepository'
import { Result } from '../../../shared/types/Result'

interface ContactInput {
  name: string
  phoneNumbers: string[]
  emails: string[]
}

interface SyncContactsInput {
  deviceId: string
  contacts: ContactInput[]
}

export class SyncContactsUseCase {
  constructor(private readonly contactRepository: IContactRepository) {}

  async execute(input: SyncContactsInput): Promise<Result<number>> {
    const contacts = input.contacts.map((c) =>
      Contact.create({
        id: uuidv4(),
        deviceId: input.deviceId,
        name: c.name,
        phoneNumbers: c.phoneNumbers,
        emails: c.emails,
        syncedAt: new Date(),
      }),
    )

    // Full replace: delete old contacts for device, insert new ones
    await this.contactRepository.deleteByDevice(input.deviceId)
    await this.contactRepository.upsertBatch(contacts)

    return Result.ok(contacts.length)
  }
}
