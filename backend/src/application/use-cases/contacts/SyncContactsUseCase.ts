import { v4 as uuidv4 } from 'uuid'
import { Contact } from '../../../domain/entities/Contact'
import { IContactRepository } from '../../../domain/ports/repositories/IContactRepository'
import { Result } from '../../../shared/types/Result'
import { TriggerAlertUseCase } from '../alerts/TriggerAlertUseCase'

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
  constructor(
    private readonly contactRepository: IContactRepository,
    private readonly triggerAlertUseCase: TriggerAlertUseCase,
  ) {}

  async execute(input: SyncContactsInput): Promise<Result<number>> {
    // Obtener teléfonos existentes antes de borrar
    const existing = await this.contactRepository.findByDevice(input.deviceId)
    const existingPhones = new Set(existing.map((c) => c.phoneNumber).filter(Boolean))

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

    // Detectar contactos nuevos (números que no estaban antes)
    const newContacts = input.contacts.filter((c) =>
      c.phoneNumbers.some((p) => p && !existingPhones.has(p)),
    )

    if (newContacts.length > 0 && existingPhones.size > 0) {
      const names = newContacts.slice(0, 3).map((c) => c.name).join(', ')
      const extra = newContacts.length > 3 ? ` y ${newContacts.length - 3} más` : ''
      await this.triggerAlertUseCase.execute({
        deviceId: input.deviceId,
        type: 'new_contact',
        severity: 'info',
        title: '👤 Contacto nuevo añadido',
        body: `Se añadió${newContacts.length > 1 ? 'ron' : ''} ${newContacts.length} contacto${newContacts.length > 1 ? 's' : ''} nuevo${newContacts.length > 1 ? 's' : ''}: ${names}${extra}`,
        metadata: {
          count: newContacts.length,
          names: newContacts.slice(0, 5).map((c) => c.name),
        },
      })
    }

    return Result.ok(contacts.length)
  }
}
