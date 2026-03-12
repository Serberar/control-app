import { IDeviceRepository } from '../../../domain/ports/repositories/IDeviceRepository'
import { Result } from '../../../shared/types/Result'
import { NotFoundError } from '../../../shared/errors/DomainError'
import { TriggerAlertUseCase } from '../alerts/TriggerAlertUseCase'

const BATTERY_LOW_THRESHOLD = 20

interface HeartbeatInput {
  deviceId: string
  batteryLevel: number | null
  fcmToken: string | null
}

export class HeartbeatUseCase {
  constructor(
    private readonly deviceRepository: IDeviceRepository,
    private readonly triggerAlertUseCase: TriggerAlertUseCase,
  ) {}

  async execute(input: HeartbeatInput): Promise<Result<void, NotFoundError>> {
    const device = await this.deviceRepository.findById(input.deviceId)
    if (!device) {
      return Result.fail(new NotFoundError('Dispositivo'))
    }

    // Detectar cruce del umbral de batería baja (solo cuando baja de 20% por primera vez)
    if (
      input.batteryLevel !== null &&
      input.batteryLevel <= BATTERY_LOW_THRESHOLD &&
      (device.batteryLevel === null || device.batteryLevel > BATTERY_LOW_THRESHOLD)
    ) {
      await this.triggerAlertUseCase.execute({
        deviceId: input.deviceId,
        type: 'battery_low',
        severity: 'warning',
        title: '🔋 Batería baja',
        body: `La batería del dispositivo está al ${input.batteryLevel}%`,
        metadata: { batteryLevel: input.batteryLevel },
      })
    }

    await this.deviceRepository.updateHeartbeat(input.deviceId, input.batteryLevel, input.fcmToken)
    return Result.ok(undefined)
  }
}
