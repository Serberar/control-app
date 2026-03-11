import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import MapView, { Circle, Marker, MapPressEvent } from 'react-native-maps'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/AppNavigator'
import { api } from '../services/ApiService'
import { Geofence } from '../types'

type Props = NativeStackScreenProps<RootStackParamList, 'Geofences'>

interface NewZone {
  latitude: number
  longitude: number
  name: string
  radiusMeters: number
}

export default function GeofenceScreen({ route }: Props) {
  const { deviceId } = route.params

  const [geofences, setGeofences] = useState<Geofence[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newZone, setNewZone] = useState<NewZone | null>(null)
  const [saving, setSaving] = useState(false)
  const mapRef = useRef<MapView>(null)

  const load = useCallback(async () => {
    try {
      const data = await api.getGeofences(deviceId)
      setGeofences(data)
    } catch (e) {
      console.error('Error cargando geofences:', e)
    } finally {
      setLoading(false)
    }
  }, [deviceId])

  useEffect(() => { load() }, [load])

  const onMapPress = (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate
    setNewZone({ latitude, longitude, name: '', radiusMeters: 200 })
    setShowCreateModal(true)
  }

  const createZone = async () => {
    if (!newZone || !newZone.name.trim()) {
      Alert.alert('Error', 'Escribe un nombre para la zona')
      return
    }
    setSaving(true)
    try {
      const created = await api.createGeofence(
        deviceId,
        newZone.name.trim(),
        newZone.latitude,
        newZone.longitude,
        newZone.radiusMeters,
      )
      setGeofences((prev) => [...prev, created])
      setShowCreateModal(false)
    } catch {
      Alert.alert('Error', 'No se pudo crear la zona')
    } finally {
      setSaving(false)
    }
  }

  const deleteZone = (id: string, name: string) => {
    Alert.alert('Eliminar zona', `¿Eliminar "${name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await api.deleteGeofence(id)
          setGeofences((prev) => prev.filter((g) => g.id !== id))
        },
      },
    ])
  }

  const toggleActive = async (id: string, active: boolean) => {
    await api.setGeofenceActive(id, active)
    setGeofences((prev) =>
      prev.map((g) => (g.id === id ? { ...g, active } : g)),
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
      {/* Mapa */}
      <MapView
        ref={mapRef}
        style={styles.map}
        onPress={onMapPress}
        showsUserLocation={false}
      >
        {geofences.map((g) => (
          <React.Fragment key={g.id}>
            <Circle
              center={{ latitude: g.latitude, longitude: g.longitude }}
              radius={g.radiusMeters}
              fillColor={g.active ? 'rgba(25,118,210,0.15)' : 'rgba(158,158,158,0.15)'}
              strokeColor={g.active ? '#1976d2' : '#9e9e9e'}
              strokeWidth={2}
            />
            <Marker
              coordinate={{ latitude: g.latitude, longitude: g.longitude }}
              title={g.name}
              description={`Radio: ${g.radiusMeters}m`}
              pinColor={g.active ? '#1976d2' : '#9e9e9e'}
            />
          </React.Fragment>
        ))}
      </MapView>

      {/* Instrucción */}
      <View style={styles.hint}>
        <Text style={styles.hintText}>Pulsa en el mapa para añadir una zona</Text>
      </View>

      {/* Lista de zonas */}
      <FlatList
        data={geofences}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.empty}>Sin zonas configuradas — toca el mapa para crear</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.zoneName}>{item.name}</Text>
              <Text style={styles.zoneDetail}>Radio: {item.radiusMeters}m</Text>
            </View>
            <Switch
              value={item.active}
              onValueChange={(val) => toggleActive(item.id, val)}
              trackColor={{ true: '#1976d2' }}
            />
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => deleteZone(item.id, item.name)}
            >
              <Text style={styles.deleteBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Modal de nueva zona */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nueva zona</Text>

            <Text style={styles.label}>Nombre</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Casa, Colegio, Parque…"
              value={newZone?.name ?? ''}
              onChangeText={(t) => setNewZone((z) => z ? { ...z, name: t } : null)}
              autoFocus
            />

            <Text style={styles.label}>Radio: {newZone?.radiusMeters ?? 200}m</Text>
            <View style={styles.radiusRow}>
              {[100, 200, 500, 1000, 2000].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.radiusChip,
                    newZone?.radiusMeters === r && styles.radiusChipActive,
                  ]}
                  onPress={() => setNewZone((z) => z ? { ...z, radiusMeters: r } : null)}
                >
                  <Text
                    style={[
                      styles.radiusChipText,
                      newZone?.radiusMeters === r && styles.radiusChipTextActive,
                    ]}
                  >
                    {r >= 1000 ? `${r / 1000}km` : `${r}m`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, saving && styles.confirmBtnDisabled]}
                onPress={createZone}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmBtnText}>Crear zona</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  map: { height: '45%' },

  hint: {
    backgroundColor: '#e3f2fd',
    paddingVertical: 6,
    alignItems: 'center',
  },
  hintText: { fontSize: 12, color: '#1565c0' },

  list: { flex: 1, backgroundColor: '#f5f5f5' },
  listContent: { padding: 12, gap: 8 },
  empty: { textAlign: 'center', color: '#9e9e9e', marginTop: 20, fontSize: 14 },

  row: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
    gap: 10,
  },
  rowInfo: { flex: 1 },
  zoneName: { fontSize: 15, fontWeight: '600', color: '#212121' },
  zoneDetail: { fontSize: 12, color: '#9e9e9e', marginTop: 2 },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffebee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: { color: '#d32f2f', fontWeight: '700', fontSize: 14 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, color: '#212121' },
  label: { fontSize: 13, color: '#616161', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 16,
  },
  radiusRow: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  radiusChip: {
    borderWidth: 1,
    borderColor: '#bdbdbd',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  radiusChipActive: { backgroundColor: '#1976d2', borderColor: '#1976d2' },
  radiusChipText: { fontSize: 13, color: '#616161' },
  radiusChipTextActive: { color: '#fff' },
  modalBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#bdbdbd',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: { color: '#616161', fontWeight: '600' },
  confirmBtn: {
    flex: 1,
    backgroundColor: '#1976d2',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: '#fff', fontWeight: '700' },
})
