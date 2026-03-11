import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native'
import { api } from '../services/ApiService'

export function PairingScreen() {
  const [deviceName, setDeviceName] = useState('')
  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState<string | null>(null)

  const generateCode = async () => {
    if (!deviceName.trim()) {
      Alert.alert('Error', 'Escribe un nombre para el dispositivo (ej: "Móvil hijo mayor")')
      return
    }
    setLoading(true)
    try {
      const result = await api.createPairingCode(deviceName.trim())
      setCode(result.code)
    } catch {
      Alert.alert('Error', 'No se pudo generar el código. Comprueba la conexión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      {!code ? (
        <>
          <Text style={styles.title}>Añadir dispositivo hijo</Text>
          <Text style={styles.subtitle}>
            Genera un código e introdúcelo en el móvil del hijo durante la instalación.
            El código expira en 24 horas.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Nombre del dispositivo (ej: Móvil hijo mayor)"
            placeholderTextColor="#94A3B8"
            value={deviceName}
            onChangeText={setDeviceName}
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={generateCode}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Generar código</Text>
            }
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.title}>Código generado</Text>
          <Text style={styles.subtitle}>
            Introduce este código en el móvil de tu hijo durante la instalación de la app.
          </Text>

          <View style={styles.codeBox}>
            <Text style={styles.code}>{code}</Text>
          </View>

          <Text style={styles.warning}>
            Este código es válido durante 24 horas y solo se puede usar una vez.
          </Text>

          <TouchableOpacity
            style={styles.buttonSecondary}
            onPress={() => { setCode(null); setDeviceName('') }}
          >
            <Text style={styles.buttonSecondaryText}>Generar otro código</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F1F5F9',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 32,
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#1E293B',
    color: '#F1F5F9',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  codeBox: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  code: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#60A5FA',
    letterSpacing: 8,
  },
  warning: {
    fontSize: 13,
    color: '#F59E0B',
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonSecondary: {
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  buttonSecondaryText: { color: '#94A3B8', fontSize: 16 },
})
