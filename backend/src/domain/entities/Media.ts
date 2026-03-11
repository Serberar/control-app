export type MediaType = 'photo' | 'video'

export interface MediaProps {
  id: string
  deviceId: string
  filePath: string
  thumbnailPath: string | null
  fileType: MediaType
  fileSizeBytes: number | null
  thumbnailUploaded: boolean
  fullUploaded: boolean
  takenAt: Date | null
  createdAt: Date
}

export class Media {
  readonly id: string
  readonly deviceId: string
  readonly filePath: string
  readonly thumbnailPath: string | null
  readonly fileType: MediaType
  readonly fileSizeBytes: number | null
  readonly thumbnailUploaded: boolean
  readonly fullUploaded: boolean
  readonly takenAt: Date | null
  readonly createdAt: Date

  constructor(props: MediaProps) {
    this.id = props.id
    this.deviceId = props.deviceId
    this.filePath = props.filePath
    this.thumbnailPath = props.thumbnailPath
    this.fileType = props.fileType
    this.fileSizeBytes = props.fileSizeBytes
    this.thumbnailUploaded = props.thumbnailUploaded
    this.fullUploaded = props.fullUploaded
    this.takenAt = props.takenAt
    this.createdAt = props.createdAt
  }

  static create(props: Omit<MediaProps, 'createdAt'>): Media {
    return new Media({ ...props, createdAt: new Date() })
  }
}
