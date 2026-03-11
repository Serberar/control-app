import { IUrlHistoryRepository, UrlHistoryFilter, DomainStat } from '../../../domain/ports/repositories/IUrlHistoryRepository'
import { UrlHistory } from '../../../domain/entities/UrlHistory'
import { Result } from '../../../shared/types/Result'

interface GetUrlHistoryInput {
  deviceId: string
  domain?: string
  from?: Date
  to?: Date
  limit?: number
  offset?: number
}

export class GetUrlHistoryUseCase {
  constructor(private readonly urlHistoryRepository: IUrlHistoryRepository) {}

  async getHistory(input: GetUrlHistoryInput): Promise<Result<UrlHistory[]>> {
    const filter: UrlHistoryFilter = {
      deviceId: input.deviceId,
      domain: input.domain,
      from: input.from,
      to: input.to,
      limit: input.limit ?? 100,
      offset: input.offset ?? 0,
    }
    const entries = await this.urlHistoryRepository.findByDevice(filter)
    return Result.ok(entries)
  }

  async getTopDomains(deviceId: string, limit = 20): Promise<Result<DomainStat[]>> {
    const stats = await this.urlHistoryRepository.findTopDomains(deviceId, limit)
    return Result.ok(stats)
  }
}
