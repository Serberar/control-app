import { IDeviceRepository } from '../../domain/ports/repositories/IDeviceRepository'
import { IAlertRepository } from '../../domain/ports/repositories/IAlertRepository'
import { TriggerAlertUseCase } from '../../application/use-cases/alerts/TriggerAlertUseCase'

const INACTIVITY_HOURS = 24
const CHECK_INTERVAL_MS = 60 * 60 * 1000 // cada hora

export class InactivityCheckJob {
  private timer: NodeJS.Timeout | null = null

  constructor(
    private readonly deviceRepository: IDeviceRepository,
    private readonly alertRepository: IAlertRepository,
    private readonly triggerAlertUseCase: TriggerAlertUseCase,
  ) {}

  start(): void {
    // Primera ejecución tras arranque (diferida 1 min para no molestar al inicio)
    setTimeout(() => {
      void this.check()
      this.timer = setInterval(() => { void this.check() }, CHECK_INTERVAL_MS)
    }, 60_000)

    console.log('[InactivityCheckJob] Iniciado — comprueba inactividad cada hora')
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private async check(): Promise<void> {
    try {
      const devices = await this.deviceRepository.findAllActive()
      const now = new Date()
      const threshold = new Date(now.getTime() - INACTIVITY_HOURS * 60 * 60 * 1000)
      // Ventana anti-spam: no repetir alerta si ya se envió en las últimas 12h
      const antiSpamSince = new Date(now.getTime() - 12 * 60 * 60 * 1000)

      for (const device of devices) {
        const lastSeen = device.lastSeenAt
        if (!lastSeen || lastSeen > threshold) continue

        const alreadyAlerted = await this.alertRepository.hasRecentAlert(
          device.id,
          'inactivity',
          antiSpamSince,
        )
        if (alreadyAlerted) continue

        const hoursAgo = Math.round((now.getTime() - lastSeen.getTime()) / (60 * 60 * 1000))
        await this.triggerAlertUseCase.execute({
          deviceId: device.id,
          type: 'inactivity',
          severity: 'warning',
          title: '📵 Sin actividad',
          body: `El dispositivo lleva ${hoursAgo} horas sin conectarse al servidor`,
          metadata: { lastSeenAt: lastSeen.toISOString(), hoursAgo },
        })
      }
    } catch (err) {
      console.error('[InactivityCheckJob] Error en comprobación:', err)
    }
  }
}
