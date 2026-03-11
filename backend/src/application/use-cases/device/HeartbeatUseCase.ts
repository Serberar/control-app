import { IDeviceRepository } from '../../../domain/ports/repositories/IDeviceRepository'
import { Result } from '../../../shared/types/Result'
import { NotFoundError } from '../../../shared/errors/DomainError'

interface HeartbeatInput {
  deviceId: string
  batteryLevel: number | null
  fcmToken: string | null
}

export class HeartbeatUseCase {
  constructor(private readonly deviceRepository: IDeviceRepository) {}

  async execute(input: HeartbeatInput): Promise<Result<void, NotFoundError>> {
    const device = await this.deviceRepository.findById(input.deviceId)
    if (!device) {
      return Result.fail(new NotFoundError('Dispositivo'))
    }

    await this.deviceRepository.updateHeartbeat(input.deviceId, input.batteryLevel, input.fcmToken)
    return Result.ok(undefined)
  }
}
