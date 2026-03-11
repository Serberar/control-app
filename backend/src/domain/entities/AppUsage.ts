import { randomUUID } from 'crypto'

export interface AppUsageData {
  id: string
  deviceId: string
  packageName: string
  appLabel: string
  date: string       // YYYY-MM-DD
  totalMinutes: number
  openCount: number
  lastUsed: Date
}

export class AppUsage {
  id: string
  deviceId: string
  packageName: string
  appLabel: string
  date: string
  totalMinutes: number
  openCount: number
  lastUsed: Date

  constructor(data: AppUsageData) {
    this.id = data.id
    this.deviceId = data.deviceId
    this.packageName = data.packageName
    this.appLabel = data.appLabel
    this.date = data.date
    this.totalMinutes = data.totalMinutes
    this.openCount = data.openCount
    this.lastUsed = data.lastUsed
  }

  static create(
    deviceId: string,
    packageName: string,
    appLabel: string,
    date: string,
    totalMinutes: number,
    openCount: number,
    lastUsed: Date,
  ): AppUsage {
    return new AppUsage({
      id: randomUUID(),
      deviceId,
      packageName,
      appLabel,
      date,
      totalMinutes,
      openCount,
      lastUsed,
    })
  }
}
