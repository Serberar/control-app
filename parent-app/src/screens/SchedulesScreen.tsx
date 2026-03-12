import React, { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/AppNavigator'
import { api } from '../services/ApiService'
import { Schedule } from '../types'

type Props = NativeStackScreenProps<RootStackParamList, 'Schedules'>

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

/** bit 0 = Dom, 1 = Lun, ..., 6 = Sáb (coincide con JS Date.getDay()) */
function toggleDay(mask: number, bit: number): number {
  return mask ^ (1 << bit)
}

function dayMaskToString(mask: number): string {
  const active = DAY_LABELS.filter((_, i) => (mask & (1 << i)) !== 0)
  if (active.length === 7) return 'Todos los días'
  if (active.length === 0) return 'Ningún día'
  return active.join(', ')
}

export default function SchedulesScreen({ route }: Props) {
  const { deviceId } = route.params
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [showModal, setShowModal] = useState(false)

  // Formulario
  const [name, setName] = useState('')
  const [activeDays, setActiveDays] = useState(0b0111110) // L-V por defecto
  const [startTime, setStartTime] = useState('22:00')
  const [endTime, setEndTime] = useState('08:00')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await api.getSchedules(deviceId)
      setSchedules(data)
    } catch (e) {
      console.error('Error cargando horarios:', e)
    }
  }, [deviceId])

  useEffect(() => { load() }, [load])

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const handleCreate = async () => {
    if (!name.trim() || activeDays === 0) return
    if (!isValidTime(startTime) || !isValidTime(endTime)) {
      Alert.alert('Error', 'Formato de hora inválido. Usa HH:MM (ej. 22:00)')
      return
    }
    setSaving(true)
    try {
      const schedule = await api.createSchedule(deviceId, name.trim(), activeDays, startTime, endTime)
      setSchedules((prev) => [schedule, ...prev])
      setShowModal(false)
      resetForm()
    } catch {
      Alert.alert('Error', 'No se pudo crear el horario')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (schedule: Schedule) => {
    Alert.alert(
      'Eliminar horario',
      `¿Eliminar "${schedule.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteSchedule(schedule.id)
              setSchedules((prev) => prev.filter((s) => s.id !== schedule.id))
            } catch {
              Alert.alert('Error', 'No se pudo eliminar el horario')
            }
          },
        },
      ],
    )
  }

  const handleToggleActive = async (schedule: Schedule) => {
    try {
      await api.setScheduleActive(schedule.id, !schedule.isActive)
      setSchedules((prev) =>
        prev.map((s) => s.id === schedule.id ? { ...s, isActive: !s.isActive } : s),
      )
    } catch {
      Alert.alert('Error', 'No se pudo cambiar el estado')
    }
  }

  const resetForm = () => {
    setName('')
    setActiveDays(0b0111110)
    setStartTime('22:00')
    setEndTime('08:00')
  }

  const isValidTime = (t: string) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(t)

  const renderItem = ({ item }: { item: Schedule }) => (
    <View style={[styles.card, !item.isActive && styles.cardInactive]}>
      <View style={styles.cardBody}>
        <Text style={styles.cardName}>{item.name}</Text>
        <Text style={styles.cardDays}>{dayMaskToString(item.activeDays)}</Text>
        <Text style={styles.cardTime}>{item.startTime} → {item.endTime}</Text>
      </View>
      <View style={styles.cardActions}>
        <Switch
          value={item.isActive}
          onValueChange={() => handleToggleActive(item)}
          trackColor={{ true: '#1976d2' }}
          thumbColor="#fff"
        />
        <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
          <Text style={styles.deleteBtnText}>🗑</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
        <Text style={styles.addBtnText}>+ Nuevo horario</Text>
      </TouchableOpacity>

      {schedules.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Sin horarios configurados</Text>
          <Text style={styles.emptyHint}>
            Añade un horario para bloquear el dispositivo{'\n'}
            automáticamente durante clases o por la noche
          </Text>
        </View>
      ) : (
        <FlatList
          data={schedules}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      {/* Modal crear horario */}
      <Modal visible={showModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Nuevo horario de bloqueo</Text>

            <Text style={styles.fieldLabel}>Nombre *</Text>
            <TextInput
              style={styles.input}
              placeholder="ej: Horario escolar"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.fieldLabel}>Días activos</Text>
            <View style={styles.daysRow}>
              {DAY_LABELS.map((label, i) => {
                const active = (activeDays & (1 << i)) !== 0
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.dayBtn, active && styles.dayBtnActive]}
                    onPress={() => setActiveDays(toggleDay(activeDays, i))}
                  >
                    <Text style={[styles.dayBtnText, active && styles.dayBtnTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <Text style={styles.fieldLabel}>Inicio</Text>
                <TextInput
                  style={styles.timeInput}
                  placeholder="22:00"
                  value={startTime}
                  onChangeText={setStartTime}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
              </View>
              <View style={styles.timeField}>
                <Text style={styles.fieldLabel}>Fin</Text>
                <TextInput
                  style={styles.timeInput}
                  placeholder="08:00"
                  value={endTime}
                  onChangeText={setEndTime}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
              </View>
            </View>
            <Text style={styles.timeHint}>Puede cruzar medianoche (ej. 22:00 → 08:00)</Text>

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setShowModal(false); resetForm() }}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, (!name.trim() || activeDays === 0 || saving) && styles.saveBtnDisabled]}
                onPress={handleCreate}
                disabled={!name.trim() || activeDays === 0 || saving}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Guardando...' : 'Crear'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 16, color: '#757575', fontWeight: '600' },
  emptyHint: { fontSize: 13, color: '#9e9e9e', textAlign: 'center', marginTop: 8 },

  addBtn: {
    backgroundColor: '#1976d2',
    margin: 12,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  list: { paddingBottom: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 10,
    padding: 14,
    elevation: 1,
  },
  cardInactive: { opacity: 0.5 },
  cardBody: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#212121' },
  cardDays: { fontSize: 12, color: '#1976d2', marginTop: 3 },
  cardTime: { fontSize: 13, color: '#616161', marginTop: 2 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deleteBtn: { padding: 6 },
  deleteBtnText: { fontSize: 18 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 36,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#212121', marginBottom: 16 },
  fieldLabel: { fontSize: 13, color: '#757575', fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#212121',
  },
  daysRow: { flexDirection: 'row', gap: 6 },
  dayBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  dayBtnActive: { borderColor: '#1976d2', backgroundColor: '#1976d2' },
  dayBtnText: { fontSize: 11, color: '#757575' },
  dayBtnTextActive: { color: '#fff', fontWeight: '700' },
  timeRow: { flexDirection: 'row', gap: 16 },
  timeField: { flex: 1 },
  timeInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#212121',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  timeHint: { fontSize: 11, color: '#9e9e9e', marginTop: 6 },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  cancelBtnText: { color: '#757575', fontSize: 15 },
  saveBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: '#1976d2',
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
