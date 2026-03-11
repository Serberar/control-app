import { v4 as uuidv4 } from 'uuid'
import { LocationPoint } from '../../../domain/entities/LocationPoint'
import { ILocationRepository } from '../../../domain/ports/repositories/ILocationRepository'
import { IDeviceRepository } from '../../../domain/ports/repositories/IDeviceRepository'
import { IWebSocketService } from '../../../domain/ports/services/IWebSocketService'
import { Result } from '../../../shared/types/Result'
import { GeofenceUseCase } from '../geofence/GeofenceUseCase'
import { TriggerAlertUseCase } from '../alerts/TriggerAlertUseCase'

interface RecordLocationInput {
  deviceId: string
  latitude: number
  longitude: number
  accuracy: number | null
  altitude: number | null
  address: string | null
}

export class RecordLocationUseCase {
  constructor(
    private readonly locationRepository: ILocationRepository,
    private readonly deviceRepository: IDeviceRepository,
    private readonly webSocketService: IWebSocketService,
    private readonly geofenceUseCase?: GeofenceUseCase,
    private readonly triggerAlertUseCase?: TriggerAlertUseCase,
  ) {}

  async execute(input: RecordLocationInput): Promise<Result<LocationPoint>> {
    const point = LocationPoint.create({
      id: uuidv4(),
      deviceId: input.deviceId,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracy,
      altitude: input.altitude,
      address: input.address,
    })

    await this.locationRepository.save(point)

    // Reenviar en tiempo real al padre si está conectado (modo live)
    const device = await this.deviceRepository.findById(input.deviceId)
    if (device) {
      this.webSocketService.broadcastLocationToParent(device.userId, input.deviceId, point)
    }

    // Comprobar salida de geofences activas
    if (this.geofenceUseCase && this.triggerAlertUseCase) {
      const exits = await this.geofenceUseCase.evaluatePosition(
        input.deviceId,
        input.latitude,
        input.longitude,
      )
      for (const g of exits) {
        await this.triggerAlertUseCase.execute({
          deviceId: input.deviceId,
          type: 'geofence_exit',
          severity: 'warning',
          title: `Salió de "${g.name}"`,
          body: `El dispositivo salió de la zona "${g.name}"`,
          metadata: {
            geofenceId: g.id,
            geofenceName: g.name,
            latitude: input.latitude,
            longitude: input.longitude,
          },
        })
      }
    }

    return Result.ok(point)
  }
}
