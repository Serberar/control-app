import { Media, MediaType } from '../../entities/Media'

export interface MediaFilter {
  deviceId: string
  fileType?: MediaType
  from?: Date
  to?: Date
  limit?: number
  offset?: number
}

export interface IMediaRepository {
  save(media: Media): Promise<void>
  markThumbnailUploaded(id: string): Promise<void>
  markFullUploaded(id: string): Promise<void>
  findByDevice(filter: MediaFilter): Promise<Media[]>
  findById(id: string): Promise<Media | null>
  countSince(deviceId: string, since: Date): Promise<number>
}
