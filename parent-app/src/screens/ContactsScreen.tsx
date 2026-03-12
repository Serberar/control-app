import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/AppNavigator'
import { api } from '../services/ApiService'
import { Contact } from '../types'

type Props = NativeStackScreenProps<RootStackParamList, 'Contacts'>

export default function ContactsScreen({ route }: Props) {
  const { deviceId } = route.params
  const [contacts, setContacts] = useState<Contact[]>([])
  const [filtered, setFiltered] = useState<Contact[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await api.getContacts(deviceId)
      // Ordenar alfabéticamente
      const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name, 'es'))
      setContacts(sorted)
      setFiltered(sorted)
    } catch (e) {
      console.error('Error cargando contactos:', e)
    } finally {
      setLoading(false)
    }
  }, [deviceId])

  useEffect(() => { load() }, [load])

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const onSearch = (text: string) => {
    setSearch(text)
    if (!text.trim()) {
      setFiltered(contacts)
    } else {
      const q = text.toLowerCase()
      setFiltered(
        contacts.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.phoneNumbers.some((p) => p.includes(q)),
        ),
      )
    }
  }

  const initials = (name: string) =>
    name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('')

  const avatarColor = (name: string) => {
    const COLORS = ['#1976d2', '#388e3c', '#f57c00', '#7b1fa2', '#c62828', '#00838f']
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return COLORS[Math.abs(hash) % COLORS.length]
  }

  const renderItem = ({ item }: { item: Contact }) => (
    <View style={styles.row}>
      <View style={[styles.avatar, { backgroundColor: avatarColor(item.name) }]}>
        <Text style={styles.avatarText}>{initials(item.name)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        {item.phoneNumbers.length > 0 && (
          <Text style={styles.phone} numberOfLines={1}>
            {item.phoneNumbers.join('  ·  ')}
          </Text>
        )}
        {item.emails.length > 0 && (
          <Text style={styles.email} numberOfLines={1}>
            {item.emails[0]}
          </Text>
        )}
      </View>
    </View>
  )

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o teléfono…"
          placeholderTextColor="#9e9e9e"
          value={search}
          onChangeText={onSearch}
          clearButtonMode="while-editing"
        />
      </View>

      {filtered.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>
            {contacts.length === 0 ? 'Sin contactos sincronizados' : 'Sin resultados'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListFooterComponent={
            <Text style={styles.footerCount}>
              {filtered.length} contacto{filtered.length !== 1 ? 's' : ''}
            </Text>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 15, color: '#9e9e9e' },

  searchBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: '#212121',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#212121' },
  phone: { fontSize: 13, color: '#616161', marginTop: 2 },
  email: { fontSize: 12, color: '#9e9e9e', marginTop: 1 },

  separator: { height: StyleSheet.hairlineWidth, backgroundColor: '#e0e0e0', marginLeft: 74 },
  footerCount: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9e9e9e',
    paddingVertical: 16,
  },
})
