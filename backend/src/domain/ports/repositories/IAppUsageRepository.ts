import { AppUsage } from '../../entities/AppUsage'

export interface IAppUsageRepository {
  /** Inserta o actualiza (upsert) el registro de uso para device+package+date */
  upsert(usage: AppUsage): Promise<void>
  /** Inserta o actualiza en lote */
  upsertBatch(usages: AppUsage[]): Promise<void>
  /** Devuelve uso por dispositivo en un rango de fechas (YYYY-MM-DD) */
  findByDevice(deviceId: string, from: string, to: string): Promise<AppUsage[]>
  /** Uso total acumulado de hoy para un dispositivo y paquete */
  findTodayUsage(deviceId: string, packageName: string, date: string): Promise<AppUsage | null>
}
