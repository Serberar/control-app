import { v4 as uuidv4 } from 'uuid'
import { Geofence } from '../../../domain/entities/Geofence'
import { IGeofenceRepository } from '../../../domain/ports/repositories/IGeofenceRepository'
import { Result } from '../../../shared/types/Result'

interface CreateGeofenceInput {
  deviceId: string
  name: string
  latitude: number
  longitude: number
  radiusMeters: number
}

export class GeofenceUseCase {
  // Cache en memoria: geofenceId → bool (últimamente dentro)
  // En producción migrar a Redis / BD. Suficiente para MVP.
  private readonly stateCache = new Map<string, boolean>()

  constructor(private readonly geofenceRepository: IGeofenceRepository) {}

  async create(input: CreateGeofenceInput): Promise<Result<Geofence>> {
    const geofence = Geofence.create({
      id: uuidv4(),
      deviceId: input.deviceId,
      name: input.name,
      latitude: input.latitude,
      longitude: input.longitude,
      radiusMeters: input.radiusMeters,
    })
    await this.geofenceRepository.save(geofence)
    return Result.ok(geofence)
  }

  async list(deviceId: string): Promise<Result<Geofence[]>> {
    const geofences = await this.geofenceRepository.findByDevice(deviceId)
    return Result.ok(geofences)
  }

  async delete(id: string): Promise<Result<void>> {
    await this.geofenceRepository.delete(id)
    this.stateCache.delete(id)
    return Result.ok(undefined)
  }

  async setActive(id: string, active: boolean): Promise<Result<void>> {
    await this.geofenceRepository.setActive(id, active)
    return Result.ok(undefined)
  }

  /**
   * Evalúa una nueva posición contra todas las geofences activas del dispositivo.
   * Retorna las geofences de las que el dispositivo acaba de SALIR
   * (transición inside→outside desde la última comprobación).
   */
  async evaluatePosition(
    deviceId: string,
    latitude: number,
    longitude: number,
  ): Promise<Geofence[]> {
    const geofences = await this.geofenceRepository.findByDevice(deviceId)
    const exits: Geofence[] = []

    for (const g of geofences) {
      if (!g.active) continue
      const cacheKey = `${deviceId}:${g.id}`
      const inside = g.contains(latitude, longitude)
      const wasInside = this.stateCache.get(cacheKey) ?? true // asumir dentro en arranque

      if (wasInside && !inside) {
        exits.push(g)  // acaba de salir
      }

      this.stateCache.set(cacheKey, inside)
    }

    return exits
  }
}
