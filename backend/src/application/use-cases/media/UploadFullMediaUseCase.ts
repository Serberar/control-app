import * as path from 'path'
import * as fs from 'fs'
import { IMediaRepository } from '../../../domain/ports/repositories/IMediaRepository'
import { NotFoundError } from '../../../shared/errors/DomainError'
import { Result } from '../../../shared/types/Result'

interface UploadFullMediaInput {
  mediaId: string
  deviceId: string
  fileBuffer: Buffer
  filename: string
  fileSizeBytes: number
}

const MEDIA_DIR = process.env.MEDIA_DIR ?? '/app/media'

export class UploadFullMediaUseCase {
  constructor(private readonly mediaRepository: IMediaRepository) {}

  async execute(input: UploadFullMediaInput): Promise<Result<void>> {
    const existing = await this.mediaRepository.findById(input.mediaId)
    if (!existing) {
      return Result.fail(new NotFoundError('Media no encontrado'))
    }

    const deviceDir = path.join(MEDIA_DIR, input.deviceId)
    fs.mkdirSync(deviceDir, { recursive: true })

    const filePath = path.join(deviceDir, input.filename)
    fs.writeFileSync(filePath, input.fileBuffer)

    await this.mediaRepository.markFullUploaded(input.mediaId)

    return Result.ok(undefined)
  }
}
