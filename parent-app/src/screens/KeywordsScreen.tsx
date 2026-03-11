import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/AppNavigator'
import { api } from '../services/ApiService'

type Props = NativeStackScreenProps<RootStackParamList, 'Keywords'>

export default function KeywordsScreen({ route }: Props) {
  const { deviceId } = route.params

  const [words, setWords] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.getKeywords(deviceId).then(setWords).finally(() => setLoading(false))
  }, [deviceId])

  const addWord = () => {
    const word = input.trim().toLowerCase()
    if (!word) return
    if (words.includes(word)) {
      Alert.alert('Duplicado', `"${word}" ya está en la lista`)
      return
    }
    setWords((prev) => [...prev, word].sort())
    setInput('')
  }

  const removeWord = (word: string) => {
    setWords((prev) => prev.filter((w) => w !== word))
  }

  const save = async () => {
    setSaving(true)
    try {
      await api.setKeywords(deviceId, words)
      Alert.alert('Guardado', `${words.length} palabras clave configuradas`)
    } catch (e) {
      Alert.alert('Error', 'No se pudieron guardar las palabras clave')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Descripción */}
      <View style={styles.info}>
        <Text style={styles.infoText}>
          Recibirás una alerta cuando algún mensaje entrante contenga estas palabras.
        </Text>
      </View>

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Añadir palabra clave…"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={addWord}
          autoCapitalize="none"
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.addBtn} onPress={addWord}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Lista */}
      <FlatList
        data={words}
        keyExtractor={(item) => item}
        style={styles.list}
        renderItem={({ item }) => (
          <View style={styles.chip}>
            <Text style={styles.chipText}>{item}</Text>
            <TouchableOpacity onPress={() => removeWord(item)} hitSlop={8}>
              <Text style={styles.chipRemove}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>Sin palabras clave — añade la primera</Text>
        }
        contentContainerStyle={styles.chipList}
      />

      {/* Guardar */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={save}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Guardar ({words.length})</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  info: {
    backgroundColor: '#e3f2fd',
    margin: 12,
    borderRadius: 10,
    padding: 12,
  },
  infoText: { fontSize: 13, color: '#1565c0', lineHeight: 18 },

  inputRow: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginBottom: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  addBtn: {
    backgroundColor: '#1976d2',
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 24, lineHeight: 28 },

  list: { flex: 1 },
  chipList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#1976d2',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  chipText: { fontSize: 14, color: '#1976d2', fontWeight: '500' },
  chipRemove: { fontSize: 14, color: '#9e9e9e', fontWeight: '700' },
  empty: {
    textAlign: 'center',
    color: '#9e9e9e',
    fontSize: 14,
    marginTop: 24,
    width: '100%',
  },

  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  saveBtn: {
    backgroundColor: '#1976d2',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
