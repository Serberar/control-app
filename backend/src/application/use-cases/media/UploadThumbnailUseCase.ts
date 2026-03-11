import { v4 as uuidv4 } from 'uuid'
import * as path from 'path'
import * as fs from 'fs'
import { Media, MediaType } from '../../../domain/entities/Media'
import { IMediaRepository } from '../../../domain/ports/repositories/IMediaRepository'
import { Result } from '../../../shared/types/Result'

interface UploadThumbnailInput {
  deviceId: string
  fileType: MediaType
  takenAt: number | null  // unix ms
  thumbnailBuffer: Buffer
  originalFilename: string
}

const MEDIA_DIR = process.env.MEDIA_DIR ?? '/app/media'

export class UploadThumbnailUseCase {
  constructor(private readonly mediaRepository: IMediaRepository) {}

  async execute(input: UploadThumbnailInput): Promise<Result<Media>> {
    const id = uuidv4()
    const deviceDir = path.join(MEDIA_DIR, input.deviceId)
    const thumbDir = path.join(deviceDir, 'thumbnails')

    fs.mkdirSync(thumbDir, { recursive: true })

    const ext = path.extname(input.originalFilename) || '.jpg'
    const thumbFilename = `${id}_thumb${ext}`
    const thumbPath = path.join(thumbDir, thumbFilename)

    fs.writeFileSync(thumbPath, input.thumbnailBuffer)

    const media = Media.create({
      id,
      deviceId: input.deviceId,
      filePath: path.join(input.deviceId, input.originalFilename), // placeholder hasta subida completa
      thumbnailPath: path.join(input.deviceId, 'thumbnails', thumbFilename),
      fileType: input.fileType,
      fileSizeBytes: null,
      thumbnailUploaded: true,
      fullUploaded: false,
      takenAt: input.takenAt ? new Date(input.takenAt) : null,
    })

    await this.mediaRepository.save(media)

    return Result.ok(media)
  }
}
