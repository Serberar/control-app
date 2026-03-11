import { IMessageRepository, MessageFilter, ConversationSummary } from '../../../domain/ports/repositories/IMessageRepository'
import { Message, MessageApp } from '../../../domain/entities/Message'
import { Result } from '../../../shared/types/Result'

interface GetConversationsInput {
  deviceId: string
}

interface GetMessagesInput {
  deviceId: string
  app?: MessageApp
  contactIdentifier?: string
  from?: Date
  to?: Date
  limit?: number
}

export class GetMessagesUseCase {
  constructor(private readonly messageRepository: IMessageRepository) {}

  async getConversations(input: GetConversationsInput): Promise<Result<ConversationSummary[]>> {
    const conversations = await this.messageRepository.findConversations(input.deviceId)
    return Result.ok(conversations)
  }

  async getMessages(input: GetMessagesInput): Promise<Result<Message[]>> {
    const filter: MessageFilter = {
      deviceId: input.deviceId,
      app: input.app,
      contactIdentifier: input.contactIdentifier,
      from: input.from,
      to: input.to,
      limit: input.limit ?? 100,
    }
    const messages = await this.messageRepository.findByDevice(filter)
    return Result.ok(messages)
  }
}
