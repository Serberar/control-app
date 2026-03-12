import { v4 as uuidv4 } from 'uuid'
import { Alert, AlertType, AlertSeverity } from '../../../domain/entities/Alert'
import { IAlertRepository } from '../../../domain/ports/repositories/IAlertRepository'
import { IAlertPreferencesRepository } from '../../../domain/ports/repositories/IAlertPreferencesRepository'
import { IDeviceRepository } from '../../../domain/ports/repositories/IDeviceRepository'
import { IUserRepository } from '../../../domain/ports/repositories/IUserRepository'
import { INotificationService } from '../../../domain/ports/services/INotificationService'
import { Result } from '../../../shared/types/Result'

interface TriggerAlertInput {
  deviceId: string
  type: AlertType
  severity: AlertSeverity
  title: string
  body: string
  metadata?: Record<string, unknown>
}

export class TriggerAlertUseCase {
  constructor(
    private readonly alertRepository: IAlertRepository,
    private readonly alertPreferencesRepository: IAlertPreferencesRepository,
    private readonly deviceRepository: IDeviceRepository,
    private readonly userRepository: IUserRepository,
    private readonly notificationService: INotificationService,
  ) {}

  async execute(input: TriggerAlertInput): Promise<Result<Alert | null>> {
    const enabled = await this.alertPreferencesRepository.isEnabled(input.deviceId, input.type)
    if (!enabled) return Result.ok(null)

    const alert = Alert.create({
      id: uuidv4(),
      deviceId: input.deviceId,
      type: input.type,
      severity: input.severity,
      title: input.title,
      body: input.body,
      metadata: input.metadata ?? null,
    })

    await this.alertRepository.save(alert)

    // Enviar push al padre
    const device = await this.deviceRepository.findById(input.deviceId)
    if (device) {
      const parent = await this.userRepository.findById(device.userId)
      if (parent?.fcmToken) {
        await this.notificationService.sendToToken(parent.fcmToken, {
          title: input.title,
          body: input.body,
          data: {
            alertId: alert.id,
            type: input.type,
            deviceId: input.deviceId,
          },
        })
      }
    }

    return Result.ok(alert)
  }
}
