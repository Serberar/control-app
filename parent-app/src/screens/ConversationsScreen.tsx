import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/AppNavigator'
import { api } from '../services/ApiService'
import { ConversationSummary, MessageApp } from '../types'

type Props = NativeStackScreenProps<RootStackParamList, 'Conversations'>

const APP_ICONS: Record<MessageApp, string> = {
  whatsapp: '💬',
  telegram: '✈️',
  instagram: '📷',
  sms: '📱',
  teams: '🟦',
}

const APP_COLORS: Record<MessageApp, string> = {
  whatsapp: '#25D366',
  telegram: '#2CA5E0',
  instagram: '#C13584',
  sms: '#6B7280',
  teams: '#5558AF',
}

type DatePreset = 'today' | 'yesterday' | '7days' | 'all'

const DATE_LABELS: Record<DatePreset, string> = {
  today: 'Hoy',
  yesterday: 'Ayer',
  '7days': '7 días',
  all: 'Todo',
}

const APP_FILTERS: Array<{ label: string; value: MessageApp | 'all' }> = [
  { label: 'Todas', value: 'all' },
  { label: '💬 WA', value: 'whatsapp' },
  { label: '✈️ TG', value: 'telegram' },
  { label: '📷 IG', value: 'instagram' },
  { label: '📱 SMS', value: 'sms' },
  { label: '🟦 Teams', value: 'teams' },
]

function formatTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  if (diff < 24 * 60 * 60 * 1000) {
    return date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('es', { day: '2-digit', month: '2-digit' })
}

function getDateRange(preset: DatePreset): { from?: Date; to?: Date } {
  const now = new Date()
  if (preset === 'today') {
    const from = new Date(now); from.setHours(0, 0, 0, 0)
    const to = new Date(now); to.setHours(23, 59, 59, 999)
    return { from, to }
  }
  if (preset === 'yesterday') {
    const from = new Date(now); from.setDate(from.getDate() - 1); from.setHours(0, 0, 0, 0)
    const to = new Date(from); to.setHours(23, 59, 59, 999)
    return { from, to }
  }
  if (preset === '7days') {
    const from = new Date(now); from.setDate(from.getDate() - 7); from.setHours(0, 0, 0, 0)
    return { from }
  }
  return {}
}

export function ConversationsScreen({ route, navigation }: Props) {
  const { deviceId, deviceName } = route.params
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [appFilter, setAppFilter] = useState<MessageApp | 'all'>('all')
  const [dateFilter, setDateFilter] = useState<DatePreset>('all')

  const load = useCallback(async (app: MessageApp | 'all', date: DatePreset) => {
    try {
      const { from, to } = getDateRange(date)
      const data = await api.getConversations(
        deviceId,
        app === 'all' ? undefined : app,
        from,
        to,
      )
      setConversations(data)
    } catch (e) {
      console.error('Error cargando conversaciones:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [deviceId])

  useEffect(() => {
    setLoading(true)
    load(appFilter, dateFilter)
  }, [appFilter, dateFilter, load])

  const openChat = (conv: ConversationSummary) => {
    navigation.navigate('ChatDetail', {
      deviceId,
      deviceName,
      app: conv.app,
      contactName: conv.contactName ?? conv.contactIdentifier,
      contactIdentifier: conv.contactIdentifier,
    })
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Filtro por app */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterContent}
      >
        {APP_FILTERS.map(({ label, value }) => (
          <TouchableOpacity
            key={value}
            style={[styles.chip, appFilter === value && styles.chipActive]}
            onPress={() => setAppFilter(value)}
          >
            <Text style={[styles.chipText, appFilter === value && styles.chipTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Filtro por fecha */}
      <View style={styles.dateBar}>
        {(Object.keys(DATE_LABELS) as DatePreset[]).map((preset) => (
          <TouchableOpacity
            key={preset}
            style={[styles.dateChip, dateFilter === preset && styles.dateChipActive]}
            onPress={() => setDateFilter(preset)}
          >
            <Text style={[styles.dateChipText, dateFilter === preset && styles.dateChipTextActive]}>
              {DATE_LABELS[preset]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lista */}
      <FlatList
        data={conversations}
        keyExtractor={(item) => `${item.app}:${item.contactIdentifier}`}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(appFilter, dateFilter) }}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Sin conversaciones en este período</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => openChat(item)}>
            <View style={[styles.appBadge, { backgroundColor: APP_COLORS[item.app] }]}>
              <Text style={styles.appIcon}>{APP_ICONS[item.app]}</Text>
            </View>
            <View style={styles.info}>
              <View style={styles.topRow}>
                <Text style={styles.contact} numberOfLines={1}>
                  {item.contactName ?? item.contactIdentifier}
                </Text>
                <Text style={styles.time}>{formatTime(item.lastMessageAt)}</Text>
              </View>
              <Text style={styles.preview} numberOfLines={1}>
                {item.lastMessage}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, padding: 32, alignItems: 'center' },
  emptyText: { color: '#9CA3AF', fontSize: 15 },

  // Filtro app
  filterBar: { maxHeight: 48, backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  filterContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, flexDirection: 'row' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  chipText: { fontSize: 13, color: '#374151' },
  chipTextActive: { color: '#fff', fontWeight: '600' },

  // Filtro fecha
  dateBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dateChip: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateChipActive: { backgroundColor: '#EFF6FF', borderColor: '#2563EB' },
  dateChipText: { fontSize: 12, color: '#6B7280' },
  dateChipTextActive: { color: '#2563EB', fontWeight: '600' },

  // Rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  appBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  appIcon: { fontSize: 20 },
  info: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  contact: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  time: { fontSize: 12, color: '#6B7280' },
  preview: { fontSize: 13, color: '#6B7280' },
  separator: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 72 },
})
