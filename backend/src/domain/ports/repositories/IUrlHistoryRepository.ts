import { UrlHistory } from '../../entities/UrlHistory'

export interface UrlHistoryFilter {
  deviceId: string
  domain?: string
  from?: Date
  to?: Date
  limit?: number
  offset?: number
}

export interface IUrlHistoryRepository {
  saveBatch(entries: UrlHistory[]): Promise<void>
  findByDevice(filter: UrlHistoryFilter): Promise<UrlHistory[]>
  findTopDomains(deviceId: string, limit?: number): Promise<DomainStat[]>
}

export interface DomainStat {
  domain: string
  visits: number
  lastVisit: Date
}
