import { Device } from '../../../domain/entities/Device'
import { IDeviceRepository } from '../../../domain/ports/repositories/IDeviceRepository'
import { Result } from '../../../shared/types/Result'

interface GetDevicesInput {
  userId: string
}

export class GetDevicesUseCase {
  constructor(private readonly deviceRepository: IDeviceRepository) {}

  async execute(input: GetDevicesInput): Promise<Result<Device[]>> {
    const devices = await this.deviceRepository.findByUserId(input.userId)
    return Result.ok(devices)
  }
}
