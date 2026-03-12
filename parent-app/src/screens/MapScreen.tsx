import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Platform, TextInput,
} from 'react-native'
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { RootStackParamList } from '../navigation/AppNavigator'
import { api } from '../services/ApiService'
import { wsService } from '../services/WebSocketService'
import { LocationPoint } from '../types'

type Props = NativeStackScreenProps<RootStackParamList, 'Map'>

type ViewMode = 'history' | 'live'

export function MapScreen({ route }: Props) {
  const { deviceId, deviceName } = route.params

  const [viewMode, setViewMode] = useState<ViewMode>('history')
  const [historyPoints, setHistoryPoints] = useState<LocationPoint[]>([])
  const [livePoints, setLivePoints] = useState<LocationPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [locatingNow, setLocatingNow] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [timeQuery, setTimeQuery] = useState('')
  const [timeResult, setTimeResult] = useState<LocationPoint | null>(null)

  const mapRef = useRef<MapView>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // ─── Historial ─────────────────────────────────────────────────────────

  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const from = new Date(selectedDate)
      from.setHours(0, 0, 0, 0)
      const to = new Date(selectedDate)
      to.setHours(23, 59, 59, 999)

      const points = await api.getLocationHistory(deviceId, from, to)
      setHistoryPoints(points)

      if (points.length > 0) {
        const last = points[points.length - 1]
        mapRef.current?.animateToRegion({
          latitude: last.latitude,
          longitude: last.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 800)
      }
    } catch {
      Alert.alert('Error', 'No se pudo cargar el historial')
    } finally {
      setLoading(false)
    }
  }, [deviceId, selectedDate])

  useEffect(() => {
    if (viewMode === 'history') loadHistory()
  }, [viewMode, loadHistory])

  // ─── Localizar ahora ───────────────────────────────────────────────────

  const locateNow = async () => {
    setLocatingNow(true)
    try {
      const { sent } = await api.requestLocationNow(deviceId)
      if (!sent) {
        Alert.alert('Dispositivo offline', 'El dispositivo no está conectado al servidor ahora mismo. Se actualizará en el próximo ciclo de 10 minutos.')
        return
      }
      // Esperar unos segundos y cargar la última ubicación
      setTimeout(async () => {
        const point = await api.getLatestLocation(deviceId)
        if (point) {
          setHistoryPoints((prev) => [...prev, point])
          mapRef.current?.animateToRegion({
            latitude: point.latitude,
            longitude: point.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }, 800)
        }
        setLocatingNow(false)
      }, 8000)
    } catch {
      setLocatingNow(false)
      Alert.alert('Error', 'No se pudo enviar la solicitud')
    }
  }

  // ─── Live tracking ─────────────────────────────────────────────────────

  const startLive = async () => {
    setViewMode('live')
    setLivePoints([])
    await api.startLiveLocation(deviceId)

    unsubscribeRef.current = wsService.onLocationUpdate(deviceId, (point) => {
      setLivePoints((prev) => {
        const updated = [...prev, point]
        // Mover el mapa al último punto
        mapRef.current?.animateToRegion({
          latitude: point.latitude,
          longitude: point.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 500)
        return updated
      })
    })
  }

  const stopLive = async () => {
    unsubscribeRef.current?.()
    unsubscribeRef.current = null
    await api.stopLiveLocation(deviceId)
    setViewMode('history')
  }

  useEffect(() => {
    return () => {
      // Al salir de la pantalla, parar el live si estaba activo
      if (viewMode === 'live') {
        api.stopLiveLocation(deviceId)
        unsubscribeRef.current?.()
      }
    }
  }, [])

  // ─── Cambiar día ───────────────────────────────────────────────────────

  const changeDay = (delta: number) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + delta)
    if (d <= new Date()) setSelectedDate(d)
  }

  // ─── Buscar por hora ───────────────────────────────────────────────────

  const searchByTime = () => {
    const match = timeQuery.match(/^(\d{1,2}):(\d{2})$/)
    if (!match) {
      Alert.alert('Formato incorrecto', 'Escribe la hora como HH:MM (p.ej. 19:00)')
      return
    }
    const targetH = parseInt(match[1], 10)
    const targetM = parseInt(match[2], 10)
    if (targetH > 23 || targetM > 59) {
      Alert.alert('Hora inválida', 'Hora debe ser 0–23, minutos 0–59')
      return
    }
    if (historyPoints.length === 0) {
      Alert.alert('Sin datos', 'No hay puntos de ruta para este día')
      return
    }
    const targetMs = targetH * 3600000 + targetM * 60000
    let closest = historyPoints[0]
    let minDiff = Infinity
    for (const p of historyPoints) {
      const d = new Date(p.createdAt)
      const pMs = d.getHours() * 3600000 + d.getMinutes() * 60000 + d.getSeconds() * 1000
      const diff = Math.abs(pMs - targetMs)
      if (diff < minDiff) { minDiff = diff; closest = p }
    }
    setTimeResult(closest)
    mapRef.current?.animateToRegion({
      latitude: closest.latitude,
      longitude: closest.longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    }, 800)
  }

  // ─── Render ────────────────────────────────────────────────────────────

  const currentPoints = viewMode === 'live' ? livePoints : historyPoints
  const lastPoint = currentPoints[currentPoints.length - 1]

  return (
    <View style={styles.container}>
      {/* Mapa */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: 40.4168,
          longitude: -3.7038,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        showsUserLocation={false}
      >
        {/* Ruta como línea */}
        {currentPoints.length > 1 && (
          <Polyline
            coordinates={currentPoints.map((p) => ({
              latitude: p.latitude,
              longitude: p.longitude,
            }))}
            strokeColor={viewMode === 'live' ? '#EF4444' : '#2563EB'}
            strokeWidth={3}
          />
        )}

        {/* Puntos del historial */}
        {viewMode === 'history' && historyPoints.map((point, index) => (
          <Marker
            key={point.id}
            coordinate={{ latitude: point.latitude, longitude: point.longitude }}
            title={format(new Date(point.createdAt), 'HH:mm', { locale: es })}
            pinColor={index === historyPoints.length - 1 ? '#EF4444' : '#3B82F6'}
          />
        ))}

        {/* Posición actual en live */}
        {viewMode === 'live' && lastPoint && (
          <Marker
            coordinate={{ latitude: lastPoint.latitude, longitude: lastPoint.longitude }}
            title="Posición actual"
            pinColor="#EF4444"
          />
        )}

        {/* Resultado de búsqueda por hora */}
        {timeResult && (
          <Marker
            coordinate={{ latitude: timeResult.latitude, longitude: timeResult.longitude }}
            title={format(new Date(timeResult.createdAt), 'HH:mm', { locale: es })}
            description={timeResult.address ?? `${timeResult.latitude.toFixed(5)}, ${timeResult.longitude.toFixed(5)}`}
            pinColor="#F59E0B"
          />
        )}
      </MapView>

      {/* Panel de control */}
      <View style={styles.panel}>

        {/* Selector de día (solo en historial) */}
        {viewMode === 'history' && (
          <View style={styles.dateRow}>
            <TouchableOpacity onPress={() => changeDay(-1)} style={styles.arrowBtn}>
              <Text style={styles.arrowText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.dateText}>
              {format(selectedDate, "EEEE d MMM", { locale: es })}
            </Text>
            <TouchableOpacity
              onPress={() => changeDay(1)}
              disabled={selectedDate >= new Date()}
              style={[styles.arrowBtn, selectedDate >= new Date() && styles.arrowDisabled]}
            >
              <Text style={styles.arrowText}>→</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Info de puntos */}
        <Text style={styles.pointsInfo}>
          {viewMode === 'live'
            ? `🔴 En vivo — ${livePoints.length} puntos`
            : `${historyPoints.length} puntos registrados`}
        </Text>

        {/* Búsqueda por hora (solo en historial) */}
        {viewMode === 'history' && (
          <View style={styles.timeSearch}>
            <TextInput
              style={styles.timeInput}
              placeholder="19:00"
              placeholderTextColor="#475569"
              value={timeQuery}
              onChangeText={(t) => { setTimeQuery(t); if (!t) setTimeResult(null) }}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
            <TouchableOpacity style={styles.timeBtn} onPress={searchByTime}>
              <Text style={styles.timeBtnText}>¿Dónde estaba?</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Resultado de hora */}
        {timeResult && (
          <View style={styles.timeResultBox}>
            <Text style={styles.timeResultText}>
              📍 {format(new Date(timeResult.createdAt), 'HH:mm', { locale: es })}
              {timeResult.address ? `  —  ${timeResult.address}` : `  —  ${timeResult.latitude.toFixed(5)}, ${timeResult.longitude.toFixed(5)}`}
            </Text>
          </View>
        )}

        {/* Botones de acción */}
        <View style={styles.actions}>

          {/* Localizar ahora */}
          {viewMode === 'history' && (
            <TouchableOpacity
              style={[styles.btn, styles.btnNow, locatingNow && styles.btnDisabled]}
              onPress={locateNow}
              disabled={locatingNow || loading}
            >
              {locatingNow
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.btnText}>📍 ¿Dónde está?</Text>
              }
            </TouchableOpacity>
          )}

          {/* Live / Stop */}
          {viewMode === 'history' ? (
            <TouchableOpacity
              style={[styles.btn, styles.btnLive]}
              onPress={startLive}
              disabled={loading}
            >
              <Text style={styles.btnText}>🔴 Ver en vivo</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.btn, styles.btnStop]}
              onPress={stopLive}
            >
              <Text style={styles.btnText}>⏹ Parar</Text>
            </TouchableOpacity>
          )}

          {/* Recargar historial */}
          {viewMode === 'history' && (
            <TouchableOpacity
              style={[styles.btn, styles.btnRefresh, loading && styles.btnDisabled]}
              onPress={loadHistory}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.btnText}>↻</Text>
              }
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  panel: {
    backgroundColor: '#0F172A',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    gap: 16,
  },
  arrowBtn: {
    padding: 8,
    backgroundColor: '#1E293B',
    borderRadius: 8,
  },
  arrowDisabled: { opacity: 0.3 },
  arrowText: { color: '#60A5FA', fontSize: 18, fontWeight: 'bold' },
  dateText: {
    color: '#F1F5F9',
    fontSize: 15,
    fontWeight: '600',
    textTransform: 'capitalize',
    minWidth: 160,
    textAlign: 'center',
  },
  pointsInfo: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  timeSearch: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  timeInput: {
    backgroundColor: '#1E293B',
    color: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    width: 70,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  timeBtn: {
    flex: 1,
    backgroundColor: '#0F766E',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  timeBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  timeResultBox: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  timeResultText: { color: '#FCD34D', fontSize: 12 },

  btnNow: { backgroundColor: '#2563EB' },
  btnLive: { backgroundColor: '#DC2626' },
  btnStop: { backgroundColor: '#7C3AED' },
  btnRefresh: { backgroundColor: '#0F766E', flex: 0, paddingHorizontal: 16 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
})
