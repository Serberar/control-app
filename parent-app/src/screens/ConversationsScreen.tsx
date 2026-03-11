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
import { ConversationSummary, MessageApp } from '../types'

type Props = NativeStackScreenProps<RootStackParamList, 'Conversations'>

const APP_ICONS: Record<MessageApp, string> = {
  whatsapp: '💬',
  telegram: '✈️',
  instagram: '📷',
  sms: '📱',
}

const APP_COLORS: Record<MessageApp, string> = {
  whatsapp: '#25D366',
  telegram: '#2CA5E0',
  instagram: '#C13584',
  sms: '#6B7280',
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 24 * 60 * 60 * 1000) {
    return date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('es', { day: '2-digit', month: '2-digit' })
}

export function ConversationsScreen({ route, navigation }: Props) {
  const { deviceId, deviceName } = route.params
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await api.getConversations(deviceId)
      setConversations(data)
    } catch (e) {
      console.error('Error cargando conversaciones:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [deviceId])

  useEffect(() => {
    load()
  }, [load])

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
    <FlatList
      data={conversations}
      keyExtractor={(item) => `${item.app}:${item.contactIdentifier}`}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Sin conversaciones capturadas aún</Text>
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
