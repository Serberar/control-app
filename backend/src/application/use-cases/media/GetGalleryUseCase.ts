import { IMediaRepository, MediaFilter } from '../../../domain/ports/repositories/IMediaRepository'
import { Media, MediaType } from '../../../domain/entities/Media'
import { Result } from '../../../shared/types/Result'

interface GetGalleryInput {
  deviceId: string
  fileType?: MediaType
  from?: Date
  to?: Date
  limit?: number
  offset?: number
}

export class GetGalleryUseCase {
  constructor(private readonly mediaRepository: IMediaRepository) {}

  async execute(input: GetGalleryInput): Promise<Result<Media[]>> {
    const filter: MediaFilter = {
      deviceId: input.deviceId,
      fileType: input.fileType,
      from: input.from,
      to: input.to,
      limit: input.limit ?? 50,
      offset: input.offset ?? 0,
    }
    const items = await this.mediaRepository.findByDevice(filter)
    return Result.ok(items)
  }
}
