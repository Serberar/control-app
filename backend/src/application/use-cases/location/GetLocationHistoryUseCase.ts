import { LocationPoint } from '../../../domain/entities/LocationPoint'
import { ILocationRepository } from '../../../domain/ports/repositories/ILocationRepository'
import { IDeviceRepository } from '../../../domain/ports/repositories/IDeviceRepository'
import { Result } from '../../../shared/types/Result'
import { NotFoundError, UnauthorizedError } from '../../../shared/errors/DomainError'

interface GetLocationHistoryInput {
  deviceId: string
  userId: string
  from: Date
  to: Date
}

export class GetLocationHistoryUseCase {
  constructor(
    private readonly locationRepository: ILocationRepository,
    private readonly deviceRepository: IDeviceRepository,
  ) {}

  async execute(input: GetLocationHistoryInput): Promise<Result<LocationPoint[], NotFoundError | UnauthorizedError>> {
    const device = await this.deviceRepository.findById(input.deviceId)
    if (!device) {
      return Result.fail(new NotFoundError('Dispositivo'))
    }

    if (device.userId !== input.userId) {
      return Result.fail(new UnauthorizedError('No tienes acceso a este dispositivo'))
    }

    const points = await this.locationRepository.findHistory({
      deviceId: input.deviceId,
      from: input.from,
      to: input.to,
    })

    return Result.ok(points)
  }
}
