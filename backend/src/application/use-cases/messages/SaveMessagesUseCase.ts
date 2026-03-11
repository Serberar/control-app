import { v4 as uuidv4 } from 'uuid'
import { Message, MessageApp, MessageDirection } from '../../../domain/entities/Message'
import { IMessageRepository } from '../../../domain/ports/repositories/IMessageRepository'
import { Result } from '../../../shared/types/Result'
import { ManageKeywordsUseCase } from '../alerts/ManageKeywordsUseCase'
import { TriggerAlertUseCase } from '../alerts/TriggerAlertUseCase'

interface MessageInput {
  app: MessageApp
  contactName: string | null
  contactIdentifier: string
  direction: MessageDirection
  body: string
  timestamp: number // unix ms
  threadId: string | null
}

interface SaveMessagesInput {
  deviceId: string
  messages: MessageInput[]
}

export class SaveMessagesUseCase {
  constructor(
    private readonly messageRepository: IMessageRepository,
    private readonly keywordsUseCase?: ManageKeywordsUseCase,
    private readonly triggerAlertUseCase?: TriggerAlertUseCase,
  ) {}

  async execute(input: SaveMessagesInput): Promise<Result<number>> {
    const messages = input.messages.map((m) =>
      Message.create({
        id: uuidv4(),
        deviceId: input.deviceId,
        app: m.app,
        contactName: m.contactName,
        contactIdentifier: m.contactIdentifier,
        direction: m.direction,
        body: m.body,
        timestamp: new Date(m.timestamp),
        threadId: m.threadId,
      }),
    )

    await this.messageRepository.saveBatch(messages)

    // Evaluar palabras clave en mensajes entrantes
    if (this.keywordsUseCase && this.triggerAlertUseCase) {
      for (const msg of messages) {
        if (msg.direction !== 'incoming') continue
        const matched = await this.keywordsUseCase.evaluate(input.deviceId, msg.body)
        if (matched.length > 0) {
          const contact = msg.contactName ?? msg.contactIdentifier
          await this.triggerAlertUseCase.execute({
            deviceId: input.deviceId,
            type: 'keyword_match',
            severity: 'warning',
            title: 'Palabra clave detectada',
            body: `"${matched[0]}" — ${contact} (${msg.app})`,
            metadata: { keywords: matched, app: msg.app, contact, messageId: msg.id },
          })
        }
      }
    }

    return Result.ok(messages.length)
  }
}
