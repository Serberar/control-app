import { v4 as uuidv4 } from 'uuid'
import { UrlHistory } from '../../../domain/entities/UrlHistory'
import { IUrlHistoryRepository } from '../../../domain/ports/repositories/IUrlHistoryRepository'
import { Result } from '../../../shared/types/Result'

interface UrlEntry {
  url: string
  title: string | null
  app: string | null
  timestamp: number // unix ms
}

interface SaveUrlsInput {
  deviceId: string
  entries: UrlEntry[]
}

export class SaveUrlsUseCase {
  constructor(private readonly urlHistoryRepository: IUrlHistoryRepository) {}

  async execute(input: SaveUrlsInput): Promise<Result<number>> {
    const entries = input.entries.map((e) =>
      new UrlHistory({
        id: uuidv4(),
        deviceId: input.deviceId,
        url: e.url,
        title: e.title,
        app: e.app,
        createdAt: new Date(e.timestamp),
      }),
    )

    await this.urlHistoryRepository.saveBatch(entries)
    return Result.ok(entries.length)
  }
}
