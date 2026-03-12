import React, { useCallback, useEffect, useState } from 'react'
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
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { RootStackParamList } from '../navigation/AppNavigator'
import { api } from '../services/ApiService'
import { Screenshot } from '../types'

type Props = NativeStackScreenProps<RootStackParamList, 'Screenshots'>

const COLUMN_COUNT = 3
const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CELL_SIZE = (SCREEN_WIDTH - 4) / COLUMN_COUNT

export default function ScreenshotsScreen({ route }: Props) {
  const { deviceId } = route.params
  const [screenshots, setScreenshots] = useState<Screenshot[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [selected, setSelected] = useState<Screenshot | null>(null)

  const LIMIT = 30

  const load = useCallback(async (offset = 0, append = false) => {
    try {
      const data = await api.getScreenshots(deviceId, LIMIT, offset)
      if (append) {
        setScreenshots((prev) => [...prev, ...data])
      } else {
        setScreenshots(data)
      }
      setHasMore(data.length === LIMIT)
    } catch (e) {
      console.error('Error cargando capturas:', e)
    } finally {
      setLoading(false)
    }
  }, [deviceId])

  useEffect(() => { load() }, [load])

  const onRefresh = async () => {
    setRefreshing(true)
    await load(0, false)
    setRefreshing(false)
  }

  const loadMore = async () => {
    if (!hasMore || loadingMore) return
    setLoadingMore(true)
    await load(screenshots.length, true)
    setLoadingMore(false)
  }

  const renderItem = ({ item }: { item: Screenshot }) => (
    <TouchableOpacity style={styles.cell} onPress={() => setSelected(item)}>
      <Image
        source={{ uri: item.fileUrl }}
        style={styles.thumb}
        resizeMode="cover"
      />
      <Text style={styles.cellTime} numberOfLines={1}>
        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: es })}
      </Text>
    </TouchableOpacity>
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
      {screenshots.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Sin capturas todavía</Text>
          <Text style={styles.emptyHint}>
            Las capturas se toman automáticamente cada 5 minutos{'\n'}
            mientras el dispositivo está activo (Android 11+)
          </Text>
        </View>
      ) : (
        <FlatList
          data={screenshots}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={COLUMN_COUNT}
          contentContainerStyle={styles.grid}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore
              ? <ActivityIndicator style={{ margin: 16 }} color="#1976d2" />
              : null
          }
        />
      )}

      {/* Visor pantalla completa */}
      <Modal visible={!!selected} transparent animationType="fade">
        <View style={styles.viewer}>
          <TouchableOpacity style={styles.viewerClose} onPress={() => setSelected(null)}>
            <Text style={styles.viewerCloseText}>✕</Text>
          </TouchableOpacity>
          {selected && (
            <>
              <Image
                source={{ uri: selected.fileUrl }}
                style={styles.viewerImage}
                resizeMode="contain"
              />
              <Text style={styles.viewerTime}>
                {new Date(selected.createdAt).toLocaleString('es-ES')}
                {selected.sizeBytes ? `  ·  ${Math.round(selected.sizeBytes / 1024)}KB` : ''}
              </Text>
            </>
          )}
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  emptyText: { fontSize: 16, color: '#757575', fontWeight: '600' },
  emptyHint: { fontSize: 13, color: '#9e9e9e', textAlign: 'center', marginTop: 8 },

  grid: { gap: 2, padding: 2 },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  thumb: { width: '100%', height: CELL_SIZE - 18 },
  cellTime: {
    color: '#ccc',
    fontSize: 9,
    textAlign: 'center',
    paddingVertical: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },

  // Visor
  viewer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerClose: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  viewerCloseText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  viewerImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 2,
    maxHeight: '85%',
  },
  viewerTime: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
  },
})
