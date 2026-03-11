import { AppUsage } from '../../../domain/entities/AppUsage'
import { IAppUsageRepository } from '../../../domain/ports/repositories/IAppUsageRepository'

interface UsageInput {
  packageName: string
  appLabel: string
  totalMinutes: number
  openCount: number
  lastUsed: string // ISO string
}

type Result<T> = { ok: true; value: T } | { ok: false; error: Error }

export class AppUsageUseCase {
  constructor(private readonly repo: IAppUsageRepository) {}

  async save(deviceId: string, date: string, usages: UsageInput[]): Promise<Result<void>> {
    try {
      const entities = usages.map((u) =>
        AppUsage.create(deviceId, u.packageName, u.appLabel, date, u.totalMinutes, u.openCount, new Date(u.lastUsed)),
      )
      await this.repo.upsertBatch(entities)
      return { ok: true, value: undefined }
    } catch (e) {
      return { ok: false, error: e as Error }
    }
  }

  async getByDevice(deviceId: string, from: string, to: string): Promise<Result<AppUsage[]>> {
    try {
      const usages = await this.repo.findByDevice(deviceId, from, to)
      return { ok: true, value: usages }
    } catch (e) {
      return { ok: false, error: e as Error }
    }
  }

  /** Devuelve el total de minutos de hoy por app — usado por el hijo para controlar límites */
  async getTodayUsage(deviceId: string, packageName: string): Promise<Result<number>> {
    try {
      const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
      const usage = await this.repo.findTodayUsage(deviceId, packageName, today)
      return { ok: true, value: usage?.totalMinutes ?? 0 }
    } catch (e) {
      return { ok: false, error: e as Error }
    }
  }
}
