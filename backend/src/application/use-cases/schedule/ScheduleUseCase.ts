import { Schedule } from '../../../domain/entities/Schedule'
import { IScheduleRepository } from '../../../domain/ports/repositories/IScheduleRepository'

type Result<T> = { ok: true; value: T } | { ok: false; error: Error }

export class ScheduleUseCase {
  constructor(private readonly repo: IScheduleRepository) {}

  async create(
    deviceId: string,
    name: string,
    activeDays: number,
    startTime: string,
    endTime: string,
  ): Promise<Result<Schedule>> {
    try {
      const schedule = Schedule.create(deviceId, name, activeDays, startTime, endTime)
      await this.repo.save(schedule)
      return { ok: true, value: schedule }
    } catch (e) {
      return { ok: false, error: e as Error }
    }
  }

  async list(deviceId: string): Promise<Result<Schedule[]>> {
    try {
      const schedules = await this.repo.findByDevice(deviceId)
      return { ok: true, value: schedules }
    } catch (e) {
      return { ok: false, error: e as Error }
    }
  }

  async delete(id: string): Promise<Result<void>> {
    try {
      await this.repo.delete(id)
      return { ok: true, value: undefined }
    } catch (e) {
      return { ok: false, error: e as Error }
    }
  }

  async setActive(id: string, active: boolean): Promise<Result<void>> {
    try {
      await this.repo.setActive(id, active)
      return { ok: true, value: undefined }
    } catch (e) {
      return { ok: false, error: e as Error }
    }
  }

  /** Llamado por el hijo para saber si ahora mismo debe estar bloqueado */
  async isDeviceLocked(deviceId: string): Promise<Result<boolean>> {
    try {
      const schedules = await this.repo.findActiveByDevice(deviceId)
      const locked = schedules.some((s) => s.isCurrentlyActive())
      return { ok: true, value: locked }
    } catch (e) {
      return { ok: false, error: e as Error }
    }
  }
}
