import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { RootStackParamList } from '../navigation/AppNavigator'
import { api } from '../services/ApiService'
import { DeviceSummary } from '../types'

type Props = NativeStackScreenProps<RootStackParamList, 'DeviceSummary'>
type Nav = NativeStackNavigationProp<RootStackParamList>

export default function DeviceSummaryScreen({ route }: Props) {
  const { deviceId, deviceName } = route.params
  const navigation = useNavigation<Nav>()

  const [summary, setSummary] = useState<DeviceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [locking, setLocking] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await api.getDeviceSummary(deviceId)
      setSummary(data)
    } catch (e) {
      console.error('Error cargando resumen:', e)
    } finally {
      setLoading(false)
    }
  }, [deviceId])

  useEffect(() => { load() }, [load])

  const handleLock = () => {
    Alert.alert(
      'Bloquear dispositivo',
      `¿Bloquear la pantalla de ${deviceName} ahora?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Bloquear',
          style: 'destructive',
          onPress: async () => {
            setLocking(true)
            try {
              await api.lockDevice(deviceId)
              Alert.alert('Listo', 'Orden de bloqueo enviada')
            } catch {
              Alert.alert('Error', 'No se pudo enviar la orden de bloqueo')
            } finally {
              setLocking(false)
            }
          },
        },
      ],
    )
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    )
  }

  if (!summary) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>No se pudo cargar el resumen</Text>
      </View>
    )
  }

  const lastSeen = summary.lastSeenAt
    ? formatDistanceToNow(new Date(summary.lastSeenAt), { addSuffix: true, locale: es })
    : 'Nunca'

  const lastLocationTime = summary.lastLocation?.at
    ? formatDistanceToNow(new Date(summary.lastLocation.at), { addSuffix: true, locale: es })
    : null

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Estado del dispositivo */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{summary.alias ?? summary.deviceName}</Text>
          <View style={[styles.statusDot, summary.isConnected ? styles.statusOnline : styles.statusOffline]} />
        </View>
        <Text style={styles.statusText}>
          {summary.isConnected ? 'Conectado ahora' : `Última vez ${lastSeen}`}
        </Text>
        {summary.batteryLevel !== null && (
          <Text style={[styles.battery, summary.batteryLevel <= 20 && styles.batteryLow]}>
            🔋 {summary.batteryLevel}%
          </Text>
        )}
      </View>

      {/* Ubicación */}
      {summary.lastLocation && (
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('Map', { deviceId, deviceName })}
        >
          <Text style={styles.cardTitle}>📍 Última ubicación</Text>
          {summary.lastLocation.address ? (
            <Text style={styles.cardValue}>{summary.lastLocation.address}</Text>
          ) : (
            <Text style={styles.cardValue}>
              {summary.lastLocation.latitude.toFixed(5)}, {summary.lastLocation.longitude.toFixed(5)}
            </Text>
          )}
          <Text style={styles.cardSub}>{lastLocationTime}</Text>
          <Text style={styles.cardLink}>Ver en mapa →</Text>
        </TouchableOpacity>
      )}

      {/* Stats 24h */}
      <View style={styles.statsRow}>
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => navigation.navigate('Alerts', { deviceId, deviceName })}
        >
          <Text style={[styles.statNumber, summary.unreadAlerts > 0 && styles.statNumberAlert]}>
            {summary.unreadAlerts}
          </Text>
          <Text style={styles.statLabel}>Alertas{'\n'}sin leer</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statCard}
          onPress={() => navigation.navigate('Conversations', { deviceId, deviceName })}
        >
          <Text style={styles.statNumber}>{summary.messagesLast24h}</Text>
          <Text style={styles.statLabel}>Mensajes{'\n'}(24h)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statCard}
          onPress={() => navigation.navigate('Gallery', { deviceId, deviceName })}
        >
          <Text style={styles.statNumber}>{summary.photosLast24h}</Text>
          <Text style={styles.statLabel}>Fotos{'\n'}(24h)</Text>
        </TouchableOpacity>
      </View>

      {/* Bloqueo remoto */}
      <TouchableOpacity
        style={[styles.lockBtn, locking && styles.lockBtnDisabled]}
        onPress={handleLock}
        disabled={locking}
      >
        {locking
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.lockBtnText}>🔒 Bloquear pantalla ahora</Text>
        }
      </TouchableOpacity>

      {/* Accesos rápidos */}
      <View style={styles.actionsGrid}>
        {[
          { label: '💬 Mensajes', screen: 'Conversations' as const },
          { label: '📞 Llamadas', screen: 'Calls' as const },
          { label: '📸 Galería', screen: 'Gallery' as const },
          { label: '🌐 Web', screen: 'WebHistory' as const },
          { label: '🔔 Alertas', screen: 'Alerts' as const },
          { label: '🔤 Palabras clave', screen: 'Keywords' as const },
          { label: '📍 Geofencing', screen: 'Geofences' as const },
          { label: '📊 Tiempo apps', screen: 'AppUsage' as const },
          { label: '🚫 Reglas apps', screen: 'AppRules' as const },
          { label: '⏰ Horarios', screen: 'Schedules' as const },
          { label: '📱 Capturas', screen: 'Screenshots' as const },
          { label: '👤 Contactos', screen: 'Contacts' as const },
        ].map(({ label, screen }) => (
          <TouchableOpacity
            key={screen}
            style={styles.actionBtn}
            onPress={() => navigation.navigate(screen, { deviceId, deviceName })}
          >
            <Text style={styles.actionBtnText}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#9e9e9e', fontSize: 15 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 12,
    marginBottom: 0,
    padding: 16,
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#212121', flex: 1 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusOnline: { backgroundColor: '#4caf50' },
  statusOffline: { backgroundColor: '#9e9e9e' },
  statusText: { fontSize: 13, color: '#616161' },
  battery: { fontSize: 13, color: '#616161', marginTop: 4 },
  batteryLow: { color: '#f44336' },
  cardValue: { fontSize: 14, color: '#212121', marginTop: 4 },
  cardSub: { fontSize: 12, color: '#9e9e9e', marginTop: 2 },
  cardLink: { fontSize: 13, color: '#1976d2', marginTop: 8, fontWeight: '600' },

  statsRow: {
    flexDirection: 'row',
    margin: 12,
    marginBottom: 0,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    elevation: 1,
  },
  statNumber: { fontSize: 28, fontWeight: '700', color: '#212121' },
  statNumberAlert: { color: '#f44336' },
  statLabel: { fontSize: 11, color: '#9e9e9e', textAlign: 'center', marginTop: 4 },

  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    margin: 12,
    gap: 8,
  },
  actionBtn: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    elevation: 1,
  },
  actionBtnText: { fontSize: 14, color: '#424242' },

  lockBtn: {
    backgroundColor: '#d32f2f',
    borderRadius: 10,
    margin: 12,
    marginBottom: 0,
    paddingVertical: 14,
    alignItems: 'center',
    elevation: 2,
  },
  lockBtnDisabled: { backgroundColor: '#ef9a9a' },
  lockBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})
