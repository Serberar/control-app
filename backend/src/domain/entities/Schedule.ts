import { randomUUID } from 'crypto'

/**
 * activeDays: bitmask de 7 bits
 *   bit 0 = Domingo, bit 1 = Lunes, ... bit 6 = Sábado
 * startTime / endTime: "HH:MM" (puede cruzar medianoche, ej. 22:00 → 08:00)
 */
export interface ScheduleData {
  id: string
  deviceId: string
  name: string
  activeDays: number   // bitmask 0–127
  startTime: string    // "HH:MM"
  endTime: string      // "HH:MM"
  isActive: boolean
  createdAt: Date
}

export class Schedule {
  id: string
  deviceId: string
  name: string
  activeDays: number
  startTime: string
  endTime: string
  isActive: boolean
  createdAt: Date

  constructor(data: ScheduleData) {
    this.id = data.id
    this.deviceId = data.deviceId
    this.name = data.name
    this.activeDays = data.activeDays
    this.startTime = data.startTime
    this.endTime = data.endTime
    this.isActive = data.isActive
    this.createdAt = data.createdAt
  }

  static create(
    deviceId: string,
    name: string,
    activeDays: number,
    startTime: string,
    endTime: string,
  ): Schedule {
    return new Schedule({
      id: randomUUID(),
      deviceId,
      name,
      activeDays,
      startTime,
      endTime,
      isActive: true,
      createdAt: new Date(),
    })
  }

  /** Devuelve true si en este momento el dispositivo debe estar bloqueado */
  isCurrentlyActive(): boolean {
    if (!this.isActive) return false

    const now = new Date()
    // DAY: 0=domingo, 1=lunes, ..., 6=sábado
    const dayBit = now.getDay()
    if ((this.activeDays & (1 << dayBit)) === 0) return false

    const current = now.getHours() * 60 + now.getMinutes()
    const [sh, sm] = this.startTime.split(':').map(Number)
    const [eh, em] = this.endTime.split(':').map(Number)
    const start = sh * 60 + sm
    const end = eh * 60 + em

    if (start <= end) {
      // Rango dentro del mismo día (ej. 09:00–15:00)
      return current >= start && current < end
    } else {
      // Cruza medianoche (ej. 22:00–08:00)
      return current >= start || current < end
    }
  }
}
