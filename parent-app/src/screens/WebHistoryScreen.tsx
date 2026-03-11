import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/AppNavigator'
import { api } from '../services/ApiService'
import { DomainStat, UrlHistoryEntry } from '../types'

type Props = NativeStackScreenProps<RootStackParamList, 'WebHistory'>

type ViewMode = 'history' | 'top'

const PAGE_SIZE = 100

export default function WebHistoryScreen({ route }: Props) {
  const { deviceId } = route.params

  const [mode, setMode] = useState<ViewMode>('history')
  const [entries, setEntries] = useState<UrlHistoryEntry[]>([])
  const [domains, setDomains] = useState<DomainStat[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [search, setSearch] = useState('')
  const [activeSearch, setActiveSearch] = useState('')

  const offsetRef = useRef(0)

  const loadHistory = useCallback(
    async (reset = false) => {
      if (loading) return
      setLoading(true)
      try {
        const offset = reset ? 0 : offsetRef.current
        const data = await api.getWebHistory(
          deviceId,
          activeSearch || undefined,
          PAGE_SIZE,
          offset,
        )
        setEntries((prev) => (reset ? data : [...prev, ...data]))
        offsetRef.current = offset + data.length
        setHasMore(data.length === PAGE_SIZE)
      } catch (e) {
        console.error('Error cargando historial web:', e)
      } finally {
        setLoading(false)
      }
    },
    [deviceId, activeSearch, loading],
  )

  const loadTopDomains = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getTopDomains(deviceId, 30)
      setDomains(data)
    } catch (e) {
      console.error('Error cargando top dominios:', e)
    } finally {
      setLoading(false)
    }
  }, [deviceId])

  useEffect(() => {
    if (mode === 'history') {
      offsetRef.current = 0
      setEntries([])
      setHasMore(true)
      loadHistory(true)
    } else {
      loadTopDomains()
    }
  }, [mode, activeSearch])

  const applySearch = () => {
    setActiveSearch(search.trim())
  }

  const clearSearch = () => {
    setSearch('')
    setActiveSearch('')
  }

  const sourceColor = (source: string) => {
    switch (source) {
      case 'dns': return '#9c27b0'
      case 'https': return '#2196f3'
      case 'http': return '#ff9800'
      default: return '#757575'
    }
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString('es', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const renderEntry = ({ item }: { item: UrlHistoryEntry }) => (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <Text
          style={[styles.sourceBadge, { backgroundColor: sourceColor(item.source) }]}
        >
          {item.source.toUpperCase()}
        </Text>
        <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
      </View>
      <Text style={styles.url} numberOfLines={2}>
        {item.url}
      </Text>
      {item.title ? (
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
      ) : null}
    </View>
  )

  const renderDomain = ({ item, index }: { item: DomainStat; index: number }) => (
    <View style={styles.domainRow}>
      <Text style={styles.domainRank}>#{index + 1}</Text>
      <View style={styles.domainInfo}>
        <Text style={styles.domainName}>{item.domain}</Text>
        <Text style={styles.domainLast}>Última: {formatTime(item.lastVisit)}</Text>
      </View>
      <View style={styles.visitsBadge}>
        <Text style={styles.visitsText}>{item.visits}</Text>
        <Text style={styles.visitsLabel}>visitas</Text>
      </View>
    </View>
  )

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, mode === 'history' && styles.tabActive]}
          onPress={() => setMode('history')}
        >
          <Text style={[styles.tabText, mode === 'history' && styles.tabTextActive]}>
            Historial
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, mode === 'top' && styles.tabActive]}
          onPress={() => setMode('top')}
        >
          <Text style={[styles.tabText, mode === 'top' && styles.tabTextActive]}>
            Top dominios
          </Text>
        </TouchableOpacity>
      </View>

      {/* Búsqueda (solo en modo historial) */}
      {mode === 'history' && (
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Filtrar por dominio…"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={applySearch}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {activeSearch ? (
            <TouchableOpacity onPress={clearSearch} style={styles.searchBtn}>
              <Text style={styles.searchBtnText}>✕</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={applySearch} style={styles.searchBtn}>
              <Text style={styles.searchBtnText}>Buscar</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Lista */}
      {mode === 'history' ? (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={renderEntry}
          contentContainerStyle={styles.list}
          onEndReached={() => hasMore && loadHistory()}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loading ? <ActivityIndicator style={styles.loader} /> : null
          }
          ListEmptyComponent={
            !loading ? (
              <Text style={styles.empty}>Sin entradas de historial</Text>
            ) : null
          }
        />
      ) : (
        <FlatList
          data={domains}
          keyExtractor={(item) => item.domain}
          renderItem={renderDomain}
          contentContainerStyle={styles.list}
          ListFooterComponent={
            loading ? <ActivityIndicator style={styles.loader} /> : null
          }
          ListEmptyComponent={
            !loading ? (
              <Text style={styles.empty}>Sin datos de dominios</Text>
            ) : null
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  tabs: { flexDirection: 'row', backgroundColor: '#fff', elevation: 2 },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 3, borderBottomColor: '#1976d2' },
  tabText: { fontSize: 14, color: '#757575', fontWeight: '500' },
  tabTextActive: { color: '#1976d2' },

  searchBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 14,
  },
  searchBtn: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 14,
    borderRadius: 8,
    justifyContent: 'center',
  },
  searchBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  list: { padding: 12, gap: 8 },
  loader: { marginVertical: 16 },
  empty: { textAlign: 'center', color: '#9e9e9e', marginTop: 40, fontSize: 15 },

  row: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    elevation: 1,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  sourceBadge: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  time: { fontSize: 11, color: '#9e9e9e', marginLeft: 'auto' },
  url: { fontSize: 13, color: '#212121', fontFamily: 'monospace' },
  title: { fontSize: 12, color: '#616161', marginTop: 2 },

  domainRow: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
    gap: 12,
  },
  domainRank: { fontSize: 14, color: '#9e9e9e', fontWeight: '700', width: 28 },
  domainInfo: { flex: 1 },
  domainName: { fontSize: 15, fontWeight: '600', color: '#212121' },
  domainLast: { fontSize: 11, color: '#9e9e9e', marginTop: 2 },
  visitsBadge: { alignItems: 'center' },
  visitsText: { fontSize: 20, fontWeight: '700', color: '#1976d2' },
  visitsLabel: { fontSize: 10, color: '#9e9e9e' },
})
