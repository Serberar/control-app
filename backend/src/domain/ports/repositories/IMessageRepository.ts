import { Message, MessageApp } from '../../entities/Message'

export interface MessageFilter {
  deviceId: string
  app?: MessageApp
  contactIdentifier?: string
  from?: Date
  to?: Date
  limit?: number
}

export interface IMessageRepository {
  save(message: Message): Promise<void>
  saveBatch(messages: Message[]): Promise<void>
  findByDevice(filter: MessageFilter): Promise<Message[]>
  findConversations(deviceId: string): Promise<ConversationSummary[]>
  countSince(deviceId: string, since: Date): Promise<number>
}

export interface ConversationSummary {
  app: MessageApp
  contactName: string | null
  contactIdentifier: string
  lastMessage: string
  lastMessageAt: Date
  unreadCount: number
}
