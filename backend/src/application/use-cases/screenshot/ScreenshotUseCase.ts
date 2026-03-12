import fs from 'fs'
import path from 'path'
import { Screenshot } from '../../../domain/entities/Screenshot'
import { IScreenshotRepository } from '../../../domain/ports/repositories/IScreenshotRepository'

const SCREENSHOTS_DIR = process.env.SCREENSHOTS_DIR ?? '/volumes/screenshots'
const SERVER_URL = process.env.SERVER_URL ?? ''

type Result<T> = { ok: true; value: T } | { ok: false; error: Error }

export class ScreenshotUseCase {
  constructor(private readonly repo: IScreenshotRepository) {}

  async upload(deviceId: string, fileBuffer: Buffer, originalName: string): Promise<Result<Screenshot>> {
    try {
      const deviceDir = path.join(SCREENSHOTS_DIR, deviceId)
      if (!fs.existsSync(deviceDir)) fs.mkdirSync(deviceDir, { recursive: true })

      const timestamp = Date.now()
      const safeFilename = `${timestamp}.jpg`
      const filePath = path.join(deviceDir, safeFilename)

      fs.writeFileSync(filePath, fileBuffer)

      const relativePath = `/screenshots/${deviceId}/${safeFilename}`
      const screenshot = Screenshot.create(deviceId, relativePath, fileBuffer.length)
      await this.repo.save(screenshot)

      return { ok: true, value: screenshot }
    } catch (e) {
      return { ok: false, error: e as Error }
    }
  }

  async getByDevice(deviceId: string, limit = 50, offset = 0): Promise<Result<ScreenshotWithUrl[]>> {
    try {
      const screenshots = await this.repo.findByDevice(deviceId, limit, offset)
      const withUrls: ScreenshotWithUrl[] = screenshots.map((s) => ({
        ...s,
        fileUrl: `${SERVER_URL}${s.filePath}`,
      }))
      return { ok: true, value: withUrls }
    } catch (e) {
      return { ok: false, error: e as Error }
    }
  }
}

export interface ScreenshotWithUrl extends Screenshot {
  fileUrl: string
}
