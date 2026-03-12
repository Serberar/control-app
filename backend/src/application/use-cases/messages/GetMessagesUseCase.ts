import { IMessageRepository, MessageFilter, ConversationFilter, ConversationSummary } from '../../../domain/ports/repositories/IMessageRepository'
import { Message, MessageApp } from '../../../domain/entities/Message'
import { Result } from '../../../shared/types/Result'

interface GetConversationsInput {
  deviceId: string
  app?: MessageApp
  from?: Date
  to?: Date
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
    const filter: ConversationFilter = {
      deviceId: input.deviceId,
      app: input.app,
      from: input.from,
      to: input.to,
    }
    const conversations = await this.messageRepository.findConversations(filter)
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
