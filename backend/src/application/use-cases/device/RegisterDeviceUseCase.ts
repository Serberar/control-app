import { v4 as uuidv4 } from 'uuid'
import { Device } from '../../../domain/entities/Device'
import { IDeviceRepository } from '../../../domain/ports/repositories/IDeviceRepository'
import { IAuthService } from '../../../domain/ports/services/IAuthService'
import { Result } from '../../../shared/types/Result'
import { DomainError } from '../../../shared/errors/DomainError'

interface RegisterDeviceInput {
  userId: string
  name: string
  alias: string | null
  deviceModel: string | null
  androidVersion: string | null
  appVersion: string | null
}

interface RegisterDeviceOutput {
  device: Device
  deviceAccessToken: string
}

export class RegisterDeviceUseCase {
  constructor(
    private readonly deviceRepository: IDeviceRepository,
    private readonly authService: IAuthService,
  ) {}

  async execute(input: RegisterDeviceInput): Promise<Result<RegisterDeviceOutput, DomainError>> {
    const deviceId = uuidv4()
    const deviceToken = uuidv4()

    const device = Device.create({
      id: deviceId,
      userId: input.userId,
      name: input.name,
      alias: input.alias,
      deviceModel: input.deviceModel,
      androidVersion: input.androidVersion,
      appVersion: input.appVersion,
      deviceToken,
    })

    await this.deviceRepository.save(device)

    const deviceAccessToken = this.authService.generateDeviceAccessToken({
      deviceId: device.id,
      userId: input.userId,
    })

    return Result.ok({ device, deviceAccessToken })
  }
}
