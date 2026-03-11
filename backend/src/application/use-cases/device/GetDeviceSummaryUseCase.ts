import { IDeviceRepository } from '../../../domain/ports/repositories/IDeviceRepository'
import { ILocationRepository } from '../../../domain/ports/repositories/ILocationRepository'
import { IAlertRepository } from '../../../domain/ports/repositories/IAlertRepository'
import { IMessageRepository } from '../../../domain/ports/repositories/IMessageRepository'
import { IMediaRepository } from '../../../domain/ports/repositories/IMediaRepository'
import { Result } from '../../../shared/types/Result'
import { NotFoundError } from '../../../shared/errors/DomainError'

export interface DeviceSummary {
  deviceId: string
  deviceName: string
  alias: string | null
  lastSeenAt: Date | null
  batteryLevel: number | null
  isConnected: boolean
  lastLocation: { latitude: number; longitude: number; address: string | null; at: Date } | null
  unreadAlerts: number
  messagesLast24h: number
  photosLast24h: number
}

export class GetDeviceSummaryUseCase {
  constructor(
    private readonly deviceRepository: IDeviceRepository,
    private readonly locationRepository: ILocationRepository,
    private readonly alertRepository: IAlertRepository,
    private readonly messageRepository: IMessageRepository,
    private readonly mediaRepository: IMediaRepository,
  ) {}

  async execute(
    deviceId: string,
    isConnected: boolean,
  ): Promise<Result<DeviceSummary, NotFoundError>> {
    const device = await this.deviceRepository.findById(deviceId)
    if (!device) return Result.fail(new NotFoundError('Dispositivo'))

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const [lastLocation, unreadAlerts, messagesLast24h, photosLast24h] = await Promise.all([
      this.locationRepository.findLatest(deviceId),
      this.alertRepository.countUnread(deviceId),
      this.messageRepository.countSince(deviceId, since24h),
      this.mediaRepository.countSince(deviceId, since24h),
    ])

    return Result.ok({
      deviceId: device.id,
      deviceName: device.name,
      alias: device.alias,
      lastSeenAt: device.lastSeenAt,
      batteryLevel: device.batteryLevel,
      isConnected,
      lastLocation: lastLocation
        ? {
            latitude: lastLocation.latitude,
            longitude: lastLocation.longitude,
            address: lastLocation.address,
            at: lastLocation.createdAt,
          }
        : null,
      unreadAlerts,
      messagesLast24h,
      photosLast24h,
    })
  }
}
