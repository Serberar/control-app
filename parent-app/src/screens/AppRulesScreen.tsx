import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
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
import { AppRule, AppRuleType } from '../types'

type Props = NativeStackScreenProps<RootStackParamList, 'AppRules'>

const TIME_LIMIT_OPTIONS = [
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '1h', minutes: 60 },
  { label: '2h', minutes: 120 },
  { label: '3h', minutes: 180 },
]

function formatMinutes(mins: number | null): string {
  if (!mins) return ''
  if (mins < 60) return `${mins}min/día`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m/día` : `${h}h/día`
}

export default function AppRulesScreen({ route }: Props) {
  const { deviceId } = route.params
  const [rules, setRules] = useState<AppRule[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showModal, setShowModal] = useState(false)

  // Formulario del modal
  const [packageName, setPackageName] = useState('')
  const [appLabel, setAppLabel] = useState('')
  const [ruleType, setRuleType] = useState<AppRuleType>('block')
  const [limitMinutes, setLimitMinutes] = useState<number>(60)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await api.getAppRules(deviceId)
      setRules(data)
    } catch (e) {
      console.error('Error cargando reglas:', e)
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

  const handleCreate = async () => {
    const pkg = packageName.trim()
    const label = appLabel.trim() || pkg
    if (!pkg) return

    setSaving(true)
    try {
      const rule = await api.createAppRule(
        deviceId,
        pkg,
        label,
        ruleType,
        ruleType === 'time_limit' ? limitMinutes : undefined,
      )
      setRules((prev) => [rule, ...prev])
      setShowModal(false)
      resetForm()
    } catch (e) {
      Alert.alert('Error', 'No se pudo crear la regla. Revisa el nombre del paquete.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (rule: AppRule) => {
    Alert.alert(
      'Eliminar regla',
      `¿Eliminar la regla para "${rule.appLabel}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteAppRule(rule.id)
              setRules((prev) => prev.filter((r) => r.id !== rule.id))
            } catch {
              Alert.alert('Error', 'No se pudo eliminar la regla')
            }
          },
        },
      ],
    )
  }

  const handleToggleActive = async (rule: AppRule) => {
    try {
      await api.setAppRuleActive(rule.id, !rule.isActive)
      setRules((prev) =>
        prev.map((r) => r.id === rule.id ? { ...r, isActive: !r.isActive } : r),
      )
    } catch {
      Alert.alert('Error', 'No se pudo cambiar el estado de la regla')
    }
  }

  const resetForm = () => {
    setPackageName('')
    setAppLabel('')
    setRuleType('block')
    setLimitMinutes(60)
  }

  const renderRule = ({ item }: { item: AppRule }) => (
    <View style={[styles.ruleCard, !item.isActive && styles.ruleInactive]}>
      <View style={styles.ruleInfo}>
        <View style={styles.ruleHeader}>
          <Text style={[styles.ruleBadge, item.ruleType === 'block' ? styles.badgeBlock : styles.badgeLimit]}>
            {item.ruleType === 'block' ? '🚫 Bloqueada' : '⏱ Límite'}
          </Text>
          {item.ruleType === 'time_limit' && (
            <Text style={styles.ruleLimit}>{formatMinutes(item.dailyLimitMinutes)}</Text>
          )}
        </View>
        <Text style={styles.ruleLabel}>{item.appLabel}</Text>
        <Text style={styles.rulePkg}>{item.packageName}</Text>
      </View>
      <View style={styles.ruleActions}>
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Botón añadir */}
      <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
        <Text style={styles.addBtnText}>+ Nueva regla</Text>
      </TouchableOpacity>

      {/* Lista de reglas */}
      {rules.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Sin reglas configuradas</Text>
          <Text style={styles.emptyHint}>Añade una regla para bloquear apps{'\n'}o limitar el tiempo de uso</Text>
        </View>
      ) : (
        <FlatList
          data={rules}
          keyExtractor={(item) => item.id}
          renderItem={renderRule}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      {/* Modal crear regla */}
      <Modal visible={showModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Nueva regla de app</Text>

            <Text style={styles.fieldLabel}>Nombre del paquete *</Text>
            <TextInput
              style={styles.input}
              placeholder="ej: com.tiktok.android"
              value={packageName}
              onChangeText={setPackageName}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.fieldLabel}>Nombre visible (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="ej: TikTok"
              value={appLabel}
              onChangeText={setAppLabel}
            />

            <Text style={styles.fieldLabel}>Tipo de regla</Text>
            <View style={styles.typeRow}>
              {(['block', 'time_limit'] as AppRuleType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, ruleType === t && styles.typeBtnActive]}
                  onPress={() => setRuleType(t)}
                >
                  <Text style={[styles.typeBtnText, ruleType === t && styles.typeBtnTextActive]}>
                    {t === 'block' ? '🚫 Bloquear' : '⏱ Límite de tiempo'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {ruleType === 'time_limit' && (
              <>
                <Text style={styles.fieldLabel}>Límite diario</Text>
                <View style={styles.limitRow}>
                  {TIME_LIMIT_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.minutes}
                      style={[styles.limitBtn, limitMinutes === opt.minutes && styles.limitBtnActive]}
                      onPress={() => setLimitMinutes(opt.minutes)}
                    >
                      <Text style={[styles.limitBtnText, limitMinutes === opt.minutes && styles.limitBtnTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setShowModal(false); resetForm() }}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, (!packageName.trim() || saving) && styles.saveBtnDisabled]}
                onPress={handleCreate}
                disabled={!packageName.trim() || saving}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Guardando...' : 'Crear regla'}</Text>
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
  ruleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 10,
    padding: 14,
    elevation: 1,
  },
  ruleInactive: { opacity: 0.5 },
  ruleInfo: { flex: 1 },
  ruleHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  ruleBadge: { fontSize: 12, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeBlock: { backgroundColor: '#ffebee', color: '#c62828' },
  badgeLimit: { backgroundColor: '#fff3e0', color: '#e65100' },
  ruleLimit: { fontSize: 12, color: '#e65100', fontWeight: '600' },
  ruleLabel: { fontSize: 15, fontWeight: '600', color: '#212121' },
  rulePkg: { fontSize: 12, color: '#9e9e9e', marginTop: 2 },
  ruleActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#212121', marginBottom: 20 },
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
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  typeBtnActive: { borderColor: '#1976d2', backgroundColor: '#e3f2fd' },
  typeBtnText: { fontSize: 13, color: '#757575' },
  typeBtnTextActive: { color: '#1976d2', fontWeight: '700' },
  limitRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  limitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  limitBtnActive: { borderColor: '#1976d2', backgroundColor: '#1976d2' },
  limitBtnText: { fontSize: 13, color: '#757575' },
  limitBtnTextActive: { color: '#fff', fontWeight: '700' },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 24 },
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
