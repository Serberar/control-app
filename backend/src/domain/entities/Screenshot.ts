import { randomUUID } from 'crypto'

export interface ScreenshotData {
  id: string
  deviceId: string
  filePath: string      // ruta relativa en disco
  sizeBytes: number | null
  createdAt: Date
}

export class Screenshot {
  id: string
  deviceId: string
  filePath: string
  sizeBytes: number | null
  createdAt: Date

  constructor(data: ScreenshotData) {
    this.id = data.id
    this.deviceId = data.deviceId
    this.filePath = data.filePath
    this.sizeBytes = data.sizeBytes
    this.createdAt = data.createdAt
  }

  static create(deviceId: string, filePath: string, sizeBytes?: number): Screenshot {
    return new Screenshot({
      id: randomUUID(),
      deviceId,
      filePath,
      sizeBytes: sizeBytes ?? null,
      createdAt: new Date(),
    })
  }
}
