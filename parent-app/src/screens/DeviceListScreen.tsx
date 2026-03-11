import React, { useCallback, useEffect, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, Alert,
} from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useNavigation } from '@react-navigation/native'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Device } from '../types'
import { api } from '../services/ApiService'
import { useAuthStore } from '../store/authStore'
import { RootStackParamList } from '../navigation/AppNavigator'

type Nav = NativeStackNavigationProp<RootStackParamList>

export function DeviceListScreen() {
  const [devices, setDevices] = useState<Device[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const navigation = useNavigation<Nav>()
  const logout = useAuthStore((s) => s.logout)

  const loadDevices = useCallback(async () => {
    try {
      const data = await api.getDevices()
      setDevices(data)
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los dispositivos')
    }
  }, [])

  useEffect(() => {
    loadDevices()
    // Refresca cada 30 segundos
    const interval = setInterval(loadDevices, 30_000)
    return () => clearInterval(interval)
  }, [loadDevices])

  const onRefresh = async () => {
    setRefreshing(true)
    await loadDevices()
    setRefreshing(false)
  }

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity onPress={() => navigation.navigate('Pairing')}>
            <Text style={{ color: '#60A5FA', fontSize: 14 }}>+ Añadir</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={logout}>
            <Text style={{ color: '#F87171', fontSize: 14 }}>Salir</Text>
          </TouchableOpacity>
        </View>
      ),
    })
  }, [navigation, logout])

  const renderDevice = ({ item }: { item: Device }) => {
    const lastSeen = item.lastSeenAt
      ? formatDistanceToNow(new Date(item.lastSeenAt), { addSuffix: true, locale: es })
      : 'Nunca'

    const deviceName = item.alias ?? item.name
    return (
      <View style={styles.card}>
        <TouchableOpacity
          onPress={() => navigation.navigate('DeviceSummary', { deviceId: item.id, deviceName })}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.deviceName}>{deviceName}</Text>
            <View style={[styles.badge, item.isConnected ? styles.badgeOnline : styles.badgeOffline]}>
              <Text style={styles.badgeText}>{item.isConnected ? 'Online' : 'Offline'}</Text>
            </View>
          </View>

          <Text style={styles.deviceModel}>{item.deviceModel ?? 'Android'}</Text>

          <View style={styles.cardFooter}>
            <Text style={styles.metaText}>Última vez: {lastSeen}</Text>
            {item.batteryLevel !== null && (
              <Text style={[styles.batteryText, item.batteryLevel <= 20 && styles.batteryLow]}>
                🔋 {item.batteryLevel}%
              </Text>
            )}
          </View>
        </TouchableOpacity>

        {/* Accesos rápidos */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Conversations', { deviceId: item.id, deviceName })}
          >
            <Text style={styles.actionBtnText}>💬 Mensajes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Calls', { deviceId: item.id, deviceName })}
          >
            <Text style={styles.actionBtnText}>📞 Llamadas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Gallery', { deviceId: item.id, deviceName })}
          >
            <Text style={styles.actionBtnText}>📸 Galería</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('WebHistory', { deviceId: item.id, deviceName })}
          >
            <Text style={styles.actionBtnText}>🌐 Web</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Alerts', { deviceId: item.id, deviceName })}
          >
            <Text style={styles.actionBtnText}>🔔 Alertas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Keywords', { deviceId: item.id, deviceName })}
          >
            <Text style={styles.actionBtnText}>🔤 Palabras</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Geofences', { deviceId: item.id, deviceName })}
          >
            <Text style={styles.actionBtnText}>📍 Zonas</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {devices.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No hay dispositivos configurados</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('Pairing')}
          >
            <Text style={styles.addButtonText}>Añadir dispositivo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={devices}
          keyExtractor={(item) => item.id}
          renderItem={renderDevice}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#60A5FA"
            />
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F1F5F9',
    flex: 1,
  },
  deviceModel: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  badgeOnline: { backgroundColor: '#064E3B' },
  badgeOffline: { backgroundColor: '#1F2937' },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#6EE7B7' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaText: { fontSize: 13, color: '#64748B' },
  batteryText: { fontSize: 13, color: '#94A3B8' },
  batteryLow: { color: '#F87171' },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 10,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  actionBtnText: { color: '#94A3B8', fontSize: 13 },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
})
