import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/AppNavigator'
import { api } from '../services/ApiService'
import { GalleryItem } from '../types'

type Props = NativeStackScreenProps<RootStackParamList, 'Gallery'>

const { width } = Dimensions.get('window')
const COL = 3
const CELL = (width - 2) / COL  // 2px de separación total

type FilterType = 'all' | 'photo' | 'video'

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
    ' ' + d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

export function GalleryScreen({ route }: Props) {
  const { deviceId } = route.params
  const [items, setItems] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')
  const [selected, setSelected] = useState<GalleryItem | null>(null)
  const offset = useRef(0)
  const hasMore = useRef(true)

  const load = useCallback(async (reset = false) => {
    if (!hasMore.current && !reset) return

    const currentOffset = reset ? 0 : offset.current

    try {
      const data = await api.getGallery(
        deviceId,
        filter === 'all' ? undefined : filter,
        50,
        currentOffset,
      )

      if (reset) {
        setItems(data)
        offset.current = data.length
      } else {
        setItems((prev) => [...prev, ...data])
        offset.current += data.length
      }

      hasMore.current = data.length === 50
    } catch (e) {
      console.error('Error cargando galería:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
      setLoadingMore(false)
    }
  }, [deviceId, filter])

  useEffect(() => {
    setLoading(true)
    hasMore.current = true
    offset.current = 0
    load(true)
  }, [filter])

  const onEndReached = () => {
    if (!loadingMore && hasMore.current) {
      setLoadingMore(true)
      load()
    }
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
      {/* Filtros */}
      <View style={styles.filters}>
        {(['all', 'photo', 'video'] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'Todo' : f === 'photo' ? '📷 Fotos' : '🎥 Vídeos'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={COL}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); hasMore.current = true; load(true) }}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={{ padding: 16 }} /> : null}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Sin media sincronizada</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.cell}
            onPress={() => setSelected(item)}
            activeOpacity={0.8}
          >
            {item.thumbnailUrl ? (
              <Image source={{ uri: api.resolveMediaUrl(item.thumbnailUrl) }} style={styles.thumbnail} />
            ) : (
              <View style={[styles.thumbnail, styles.noThumb]}>
                <Text style={styles.noThumbText}>{item.fileType === 'video' ? '🎥' : '📷'}</Text>
              </View>
            )}
            {item.fileType === 'video' && (
              <View style={styles.videoOverlay}>
                <Text style={styles.videoIcon}>▶</Text>
              </View>
            )}
            {!item.fullReady && (
              <View style={styles.thumbOnlyBadge}>
                <Text style={styles.thumbOnlyText}>min</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />

      {/* Modal de detalle */}
      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setSelected(null)}>
          {selected && (
            <View style={styles.modalContent}>
              <Image
                source={{ uri: api.resolveMediaUrl(selected.fullReady ? selected.fullUrl! : selected.thumbnailUrl!) }}
                style={styles.fullImage}
                resizeMode="contain"
              />
              <View style={styles.modalInfo}>
                <Text style={styles.modalDate}>{formatDate(selected.takenAt ?? selected.createdAt)}</Text>
                {!selected.fullReady && (
                  <Text style={styles.modalBadge}>Solo miniatura — calidad completa pendiente de WiFi</Text>
                )}
              </View>
            </View>
          )}
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' },
  filters: { flexDirection: 'row', padding: 8, gap: 8 },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    alignItems: 'center',
  },
  filterBtnActive: { backgroundColor: '#2563EB' },
  filterText: { color: '#64748B', fontSize: 13, fontWeight: '500' },
  filterTextActive: { color: '#fff' },
  cell: { width: CELL, height: CELL, margin: 0.5 },
  thumbnail: { width: '100%', height: '100%', backgroundColor: '#1E293B' },
  noThumb: { justifyContent: 'center', alignItems: 'center' },
  noThumbText: { fontSize: 28 },
  videoOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  videoIcon: { color: '#fff', fontSize: 10 },
  thumbOnlyBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(234,179,8,0.9)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  thumbOnlyText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', paddingTop: 64 },
  emptyText: { color: '#64748B', fontSize: 15 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center' },
  modalContent: { width: '100%' },
  fullImage: { width: '100%', height: width },
  modalInfo: { padding: 16 },
  modalDate: { color: '#94A3B8', fontSize: 13, textAlign: 'center' },
  modalBadge: { color: '#EAB308', fontSize: 12, textAlign: 'center', marginTop: 6 },
})
