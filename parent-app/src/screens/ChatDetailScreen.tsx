import React, { useCallback, useEffect, useRef, useState } from 'react'
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
import { Message } from '../types'

type Props = NativeStackScreenProps<RootStackParamList, 'ChatDetail'>

function formatTime(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) +
    ' ' + date.toLocaleDateString('es', { day: '2-digit', month: '2-digit' })
}

export function ChatDetailScreen({ route }: Props) {
  const { deviceId, app, contactIdentifier } = route.params
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const listRef = useRef<FlatList>(null)

  const load = useCallback(async () => {
    try {
      const data = await api.getMessages(deviceId, app, contactIdentifier)
      setMessages(data)
    } catch (e) {
      console.error('Error cargando mensajes:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [deviceId, app, contactIdentifier])

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
      ref={listRef}
      data={messages}
      keyExtractor={(item) => item.id}
      inverted
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true)
            load()
          }}
        />
      }
      contentContainerStyle={styles.content}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Sin mensajes</Text>
        </View>
      }
      renderItem={({ item }) => {
        const isOutgoing = item.direction === 'outgoing'
        return (
          <View style={[styles.bubble, isOutgoing ? styles.bubbleOut : styles.bubbleIn]}>
            <Text style={styles.bubbleText}>{item.body}</Text>
            <Text style={styles.bubbleTime}>{formatTime(item.timestamp)}</Text>
          </View>
        )
      }}
    />
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, padding: 32, alignItems: 'center' },
  emptyText: { color: '#9CA3AF', fontSize: 15 },
  content: { padding: 12, paddingBottom: 24 },
  bubble: {
    maxWidth: '78%',
    padding: 10,
    borderRadius: 12,
    marginVertical: 3,
  },
  bubbleIn: {
    backgroundColor: '#F3F4F6',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  bubbleOut: {
    backgroundColor: '#DBEAFE',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  bubbleText: { fontSize: 14, color: '#111827' },
  bubbleTime: { fontSize: 10, color: '#9CA3AF', marginTop: 4, alignSelf: 'flex-end' },
})
