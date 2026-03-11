import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/AppNavigator'
import { api } from '../services/ApiService'
import { Alert as AlertItem } from '../types'

type Props = NativeStackScreenProps<RootStackParamList, 'Alerts'>

const PAGE_SIZE = 100

export default function AlertsScreen({ route }: Props) {
  const { deviceId } = route.params

  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const offsetRef = useRef(0)

  const load = useCallback(
    async (reset = false) => {
      if (loading) return
      setLoading(true)
      try {
        const offset = reset ? 0 : offsetRef.current
        const { alerts: data, unreadCount: unread } = await api.getAlerts(
          deviceId,
          unreadOnly,
          PAGE_SIZE,
          offset,
        )
        setAlerts((prev) => (reset ? data : [...prev, ...data]))
        setUnreadCount(unread)
        offsetRef.current = offset + data.length
        setHasMore(data.length === PAGE_SIZE)
      } catch (e) {
        console.error('Error cargando alertas:', e)
      } finally {
        setLoading(false)
      }
    },
    [deviceId, unreadOnly, loading],
  )

  useEffect(() => {
    offsetRef.current = 0
    setAlerts([])
    setHasMore(true)
    load(true)
  }, [unreadOnly])

  const markRead = async (alertId: string) => {
    await api.markAlertRead(alertId)
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId ? { ...a, readAt: new Date().toISOString() } : a,
      ),
    )
    setUnreadCount((c) => Math.max(0, c - 1))
  }

  const severityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#d32f2f'
      case 'warning': return '#f57c00'
      default: return '#1976d2'
    }
  }

  const typeIcon = (type: string) => {
    switch (type) {
      case 'keyword_match': return '🔤'
      case 'vpn_detected': return '🔒'
      case 'sim_change': return '📶'
      case 'new_app_installed': return '📦'
      default: return '⚠️'
    }
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString('es', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const renderAlert = ({ item }: { item: AlertItem }) => {
    const isUnread = !item.readAt
    return (
      <TouchableOpacity
        style={[styles.row, isUnread && styles.rowUnread]}
        onPress={() => isUnread && markRead(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.severityBar, { backgroundColor: severityColor(item.severity) }]} />
        <View style={styles.rowContent}>
          <View style={styles.rowTop}>
            <Text style={styles.icon}>{typeIcon(item.type)}</Text>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            {isUnread && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
          <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header con filtros */}
      <View style={styles.header}>
        <Text style={styles.unreadBadge}>
          {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo leído'}
        </Text>
        <TouchableOpacity
          style={[styles.filterBtn, unreadOnly && styles.filterBtnActive]}
          onPress={() => setUnreadOnly((v) => !v)}
        >
          <Text style={[styles.filterBtnText, unreadOnly && styles.filterBtnTextActive]}>
            Solo sin leer
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id}
        renderItem={renderAlert}
        contentContainerStyle={styles.list}
        onEndReached={() => hasMore && load()}
        onEndReachedThreshold={0.3}
        ListFooterComponent={loading ? <ActivityIndicator style={styles.loader} /> : null}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>No hay alertas</Text>
          ) : null
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  unreadBadge: { fontSize: 14, color: '#616161', fontWeight: '500' },
  filterBtn: {
    borderWidth: 1,
    borderColor: '#bdbdbd',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  filterBtnActive: { backgroundColor: '#1976d2', borderColor: '#1976d2' },
  filterBtnText: { fontSize: 13, color: '#616161' },
  filterBtnTextActive: { color: '#fff' },

  list: { padding: 12, gap: 8 },
  loader: { marginVertical: 16 },
  empty: { textAlign: 'center', color: '#9e9e9e', marginTop: 40, fontSize: 15 },

  row: {
    backgroundColor: '#fff',
    borderRadius: 10,
    flexDirection: 'row',
    overflow: 'hidden',
    elevation: 1,
  },
  rowUnread: { elevation: 3 },
  severityBar: { width: 4 },
  rowContent: { flex: 1, padding: 12 },
  rowTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 },
  icon: { fontSize: 16 },
  title: { fontSize: 14, fontWeight: '700', color: '#212121', flex: 1 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1976d2',
  },
  body: { fontSize: 13, color: '#424242', lineHeight: 18, marginBottom: 6 },
  time: { fontSize: 11, color: '#9e9e9e' },
})
