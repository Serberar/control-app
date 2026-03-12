import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/AppNavigator'
import { api } from '../services/ApiService'
import { AppUsageStat } from '../types'

type Props = NativeStackScreenProps<RootStackParamList, 'AppUsage'>

type Period = '1d' | '7d' | '30d'

const PERIODS: { label: string; value: Period; days: number }[] = [
  { label: 'Hoy', value: '1d', days: 1 },
  { label: '7 días', value: '7d', days: 7 },
  { label: '30 días', value: '30d', days: 30 },
]

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function getDateRange(days: number): { from: string; to: string } {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - (days - 1))
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { from: fmt(from), to: fmt(to) }
}

// Agrupa los registros de múltiples días por packageName y suma los minutos
function aggregate(usages: AppUsageStat[]): AppUsageStat[] {
  const map = new Map<string, AppUsageStat>()
  for (const u of usages) {
    const existing = map.get(u.packageName)
    if (!existing) {
      map.set(u.packageName, { ...u })
    } else {
      existing.totalMinutes += u.totalMinutes
      existing.openCount += u.openCount
      if (u.lastUsed > existing.lastUsed) existing.lastUsed = u.lastUsed
    }
  }
  return Array.from(map.values()).sort((a, b) => b.totalMinutes - a.totalMinutes)
}

export default function AppUsageScreen({ route }: Props) {
  const { deviceId, deviceName } = route.params
  const [period, setPeriod] = useState<Period>('7d')
  const [usages, setUsages] = useState<AppUsageStat[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (p: Period) => {
    const days = PERIODS.find((x) => x.value === p)!.days
    const { from, to } = getDateRange(days)
    try {
      const raw = await api.getAppUsage(deviceId, from, to)
      setUsages(aggregate(raw))
    } catch (e) {
      console.error('Error cargando uso de apps:', e)
    } finally {
      setLoading(false)
    }
  }, [deviceId])

  useEffect(() => {
    setLoading(true)
    load(period)
  }, [period, load])

  const onRefresh = async () => {
    setRefreshing(true)
    await load(period)
    setRefreshing(false)
  }

  const totalMinutes = usages.reduce((s, u) => s + u.totalMinutes, 0)
  const maxMinutes = usages[0]?.totalMinutes ?? 1

  const renderItem = ({ item, index }: { item: AppUsageStat; index: number }) => {
    const barWidth = `${Math.round((item.totalMinutes / maxMinutes) * 100)}%` as const
    return (
      <View style={styles.row}>
        <View style={styles.rowLeft}>
          <Text style={styles.rank}>#{index + 1}</Text>
          <View style={styles.appInfo}>
            <Text style={styles.appLabel} numberOfLines={1}>{item.appLabel}</Text>
            <Text style={styles.pkgName} numberOfLines={1}>{item.packageName}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: barWidth }]} />
            </View>
          </View>
        </View>
        <View style={styles.rowRight}>
          <Text style={styles.time}>{formatMinutes(item.totalMinutes)}</Text>
          <Text style={styles.opens}>{item.openCount}x</Text>
        </View>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Selector de período */}
      <View style={styles.periodRow}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p.value}
            style={[styles.periodBtn, period === p.value && styles.periodBtnActive]}
            onPress={() => setPeriod(p.value)}
          >
            <Text style={[styles.periodBtnText, period === p.value && styles.periodBtnTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Total */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Tiempo total de pantalla</Text>
        <Text style={styles.totalValue}>{formatMinutes(totalMinutes)}</Text>
        <Text style={styles.totalSub}>{usages.length} apps usadas</Text>
      </View>

      {/* Lista */}
      {usages.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Sin datos para este período</Text>
        </View>
      ) : (
        <FlatList
          data={usages}
          keyExtractor={(item) => item.packageName}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#9e9e9e', fontSize: 15 },

  periodRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  periodBtnActive: { borderBottomWidth: 2, borderBottomColor: '#1976d2' },
  periodBtnText: { fontSize: 14, color: '#757575' },
  periodBtnTextActive: { color: '#1976d2', fontWeight: '700' },

  totalCard: {
    backgroundColor: '#1976d2',
    margin: 12,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  totalLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  totalValue: { fontSize: 36, fontWeight: '700', color: '#fff', marginTop: 4 },
  totalSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  list: { paddingBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginBottom: 6,
    borderRadius: 10,
    padding: 12,
    elevation: 1,
  },
  rowLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rank: { fontSize: 13, color: '#9e9e9e', width: 28, textAlign: 'center' },
  appInfo: { flex: 1 },
  appLabel: { fontSize: 14, fontWeight: '600', color: '#212121' },
  pkgName: { fontSize: 11, color: '#9e9e9e', marginTop: 1 },
  barTrack: { height: 4, backgroundColor: '#e0e0e0', borderRadius: 2, marginTop: 6 },
  barFill: { height: 4, backgroundColor: '#1976d2', borderRadius: 2 },
  rowRight: { alignItems: 'flex-end', marginLeft: 8 },
  time: { fontSize: 15, fontWeight: '700', color: '#1976d2' },
  opens: { fontSize: 11, color: '#9e9e9e', marginTop: 2 },
})
