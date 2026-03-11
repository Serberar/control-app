import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/AppNavigator'
import { api } from '../services/ApiService'
import { CallLog } from '../types'

type Props = NativeStackScreenProps<RootStackParamList, 'Calls'>

const TYPE_ICONS: Record<string, string> = {
  incoming: '📲',
  outgoing: '📞',
  missed: '❌',
}

const TYPE_COLORS: Record<string, string> = {
  incoming: '#059669',
  outgoing: '#2563EB',
  missed: '#DC2626',
}

const SOURCE_LABELS: Record<string, string> = {
  native: 'Tel.',
  whatsapp: 'WA',
  telegram: 'TG',
}

function formatDuration(seconds: number): string {
  if (seconds === 0) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 24 * 60 * 60 * 1000) {
    return date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export function CallsScreen({ route }: Props) {
  const { deviceId } = route.params
  const [calls, setCalls] = useState<CallLog[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await api.getCallLogs(deviceId)
      setCalls(data)
    } catch (e) {
      console.error('Error cargando llamadas:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [deviceId])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    )
  }

  return (
    <FlatList
      data={calls}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true)
            load()
          }}
        />
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Sin llamadas registradas</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={styles.iconCol}>
            <Text style={styles.typeIcon}>{TYPE_ICONS[item.type]}</Text>
          </View>
          <View style={styles.info}>
            <View style={styles.topRow}>
              <Text style={styles.contact} numberOfLines={1}>
                {item.contactName ?? item.phoneNumber}
              </Text>
              <Text style={styles.date}>{formatDate(item.timestamp)}</Text>
            </View>
            <View style={styles.bottomRow}>
              <Text style={[styles.callType, { color: TYPE_COLORS[item.type] }]}>
                {item.type === 'incoming' ? 'Entrante' : item.type === 'outgoing' ? 'Saliente' : 'Perdida'}
              </Text>
              <Text style={styles.source}>{SOURCE_LABELS[item.source]}</Text>
              <Text style={styles.duration}>{formatDuration(item.durationSeconds)}</Text>
            </View>
          </View>
        </View>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, padding: 32, alignItems: 'center' },
  emptyText: { color: '#9CA3AF', fontSize: 15 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  iconCol: { width: 44, alignItems: 'center', marginRight: 12 },
  typeIcon: { fontSize: 22 },
  info: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  contact: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  date: { fontSize: 12, color: '#6B7280' },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  callType: { fontSize: 12, fontWeight: '500' },
  source: {
    fontSize: 11,
    color: '#fff',
    backgroundColor: '#4B5563',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  duration: { fontSize: 12, color: '#6B7280', marginLeft: 'auto' },
  separator: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 72 },
})
