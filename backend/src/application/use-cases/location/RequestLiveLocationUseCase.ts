import { IDeviceRepository } from '../../../domain/ports/repositories/IDeviceRepository'
import { ILocationRepository } from '../../../domain/ports/repositories/ILocationRepository'
import { IWebSocketService } from '../../../domain/ports/services/IWebSocketService'
import { Result } from '../../../shared/types/Result'
import { NotFoundError, UnauthorizedError, DomainError } from '../../../shared/errors/DomainError'
import { LocationPoint } from '../../../domain/entities/LocationPoint'

interface RequestNowInput {
  deviceId: string
  userId: string
}

interface StartLiveInput {
  deviceId: string
  userId: string
}

export class RequestLiveLocationUseCase {
  constructor(
    private readonly deviceRepository: IDeviceRepository,
    private readonly locationRepository: ILocationRepository,
    private readonly webSocketService: IWebSocketService,
  ) {}

  // Solicita ubicación inmediata ("¿Dónde está ahora?")
  async requestNow(input: RequestNowInput): Promise<Result<{ sent: boolean }, NotFoundError | UnauthorizedError>> {
    const device = await this.deviceRepository.findById(input.deviceId)
    if (!device) return Result.fail(new NotFoundError('Dispositivo'))
    if (device.userId !== input.userId) return Result.fail(new UnauthorizedError('No tienes acceso a este dispositivo'))

    const sent = this.webSocketService.sendToDevice(input.deviceId, 'location:request_now')
    return Result.ok({ sent })
  }

  // Inicia seguimiento en vivo (cada 30s mientras el padre tiene el mapa abierto)
  async startLive(input: StartLiveInput): Promise<Result<{ sent: boolean }, NotFoundError | UnauthorizedError>> {
    const device = await this.deviceRepository.findById(input.deviceId)
    if (!device) return Result.fail(new NotFoundError('Dispositivo'))
    if (device.userId !== input.userId) return Result.fail(new UnauthorizedError('No tienes acceso a este dispositivo'))

    const sent = this.webSocketService.sendToDevice(input.deviceId, 'location:start_live')
    return Result.ok({ sent })
  }

  // Para el seguimiento en vivo
  async stopLive(input: StartLiveInput): Promise<Result<{ sent: boolean }, NotFoundError | UnauthorizedError>> {
    const device = await this.deviceRepository.findById(input.deviceId)
    if (!device) return Result.fail(new NotFoundError('Dispositivo'))
    if (device.userId !== input.userId) return Result.fail(new UnauthorizedError('No tienes acceso a este dispositivo'))

    const sent = this.webSocketService.sendToDevice(input.deviceId, 'location:stop_live')
    return Result.ok({ sent })
  }

  // Obtiene la última ubicación conocida
  async getLatest(input: RequestNowInput): Promise<Result<LocationPoint | null, NotFoundError | UnauthorizedError | DomainError>> {
    const device = await this.deviceRepository.findById(input.deviceId)
    if (!device) return Result.fail(new NotFoundError('Dispositivo'))
    if (device.userId !== input.userId) return Result.fail(new UnauthorizedError('No tienes acceso a este dispositivo'))

    const point = await this.locationRepository.findLatest(input.deviceId)
    return Result.ok(point)
  }
}
