import React, { useEffect } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ActivityIndicator, View } from 'react-native'

import { useAuthStore } from '../store/authStore'
import { LoginScreen } from '../screens/LoginScreen'
import { DeviceListScreen } from '../screens/DeviceListScreen'
import { MapScreen } from '../screens/MapScreen'
import { PairingScreen } from '../screens/PairingScreen'
import { ConversationsScreen } from '../screens/ConversationsScreen'
import { ChatDetailScreen } from '../screens/ChatDetailScreen'
import { CallsScreen } from '../screens/CallsScreen'
import { GalleryScreen } from '../screens/GalleryScreen'
import WebHistoryScreen from '../screens/WebHistoryScreen'
import AlertsScreen from '../screens/AlertsScreen'
import KeywordsScreen from '../screens/KeywordsScreen'
import GeofenceScreen from '../screens/GeofenceScreen'
import DeviceSummaryScreen from '../screens/DeviceSummaryScreen'
import AppUsageScreen from '../screens/AppUsageScreen'
import AppRulesScreen from '../screens/AppRulesScreen'
import SchedulesScreen from '../screens/SchedulesScreen'
import ScreenshotsScreen from '../screens/ScreenshotsScreen'
import ContactsScreen from '../screens/ContactsScreen'
import { MessageApp } from '../types'

export type RootStackParamList = {
  Login: undefined
  DeviceList: undefined
  Map: { deviceId: string; deviceName: string }
  Pairing: undefined
  Conversations: { deviceId: string; deviceName: string }
  ChatDetail: {
    deviceId: string
    deviceName: string
    app: MessageApp
    contactName: string
    contactIdentifier: string
  }
  Calls: { deviceId: string; deviceName: string }
  Gallery: { deviceId: string; deviceName: string }
  WebHistory: { deviceId: string; deviceName: string }
  Alerts: { deviceId: string; deviceName: string }
  Keywords: { deviceId: string; deviceName: string }
  Geofences: { deviceId: string; deviceName: string }
  DeviceSummary: { deviceId: string; deviceName: string }
  AppUsage: { deviceId: string; deviceName: string }
  AppRules: { deviceId: string; deviceName: string }
  Schedules: { deviceId: string; deviceName: string }
  Screenshots: { deviceId: string; deviceName: string }
  Contacts: { deviceId: string; deviceName: string }
}

const Stack = createNativeStackNavigator<RootStackParamList>()

export function AppNavigator() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [])

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    )
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#1E3A5F' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="DeviceList"
              component={DeviceListScreen}
              options={{ title: 'Mis dispositivos' }}
            />
            <Stack.Screen
              name="Map"
              component={MapScreen}
              options={({ route }) => ({ title: route.params.deviceName })}
            />
            <Stack.Screen
              name="Pairing"
              component={PairingScreen}
              options={{ title: 'Añadir dispositivo' }}
            />
            <Stack.Screen
              name="Conversations"
              component={ConversationsScreen}
              options={({ route }) => ({ title: `Mensajes — ${route.params.deviceName}` })}
            />
            <Stack.Screen
              name="ChatDetail"
              component={ChatDetailScreen}
              options={({ route }) => ({ title: route.params.contactName })}
            />
            <Stack.Screen
              name="Calls"
              component={CallsScreen}
              options={({ route }) => ({ title: `Llamadas — ${route.params.deviceName}` })}
            />
            <Stack.Screen
              name="Gallery"
              component={GalleryScreen}
              options={({ route }) => ({ title: `Galería — ${route.params.deviceName}` })}
            />
            <Stack.Screen
              name="WebHistory"
              component={WebHistoryScreen}
              options={({ route }) => ({ title: `Web — ${route.params.deviceName}` })}
            />
            <Stack.Screen
              name="Alerts"
              component={AlertsScreen}
              options={({ route }) => ({ title: `Alertas — ${route.params.deviceName}` })}
            />
            <Stack.Screen
              name="Keywords"
              component={KeywordsScreen}
              options={({ route }) => ({ title: `Palabras clave — ${route.params.deviceName}` })}
            />
            <Stack.Screen
              name="Geofences"
              component={GeofenceScreen}
              options={({ route }) => ({ title: `Geofencing — ${route.params.deviceName}` })}
            />
            <Stack.Screen
              name="DeviceSummary"
              component={DeviceSummaryScreen}
              options={({ route }) => ({ title: route.params.deviceName })}
            />
            <Stack.Screen
              name="AppUsage"
              component={AppUsageScreen}
              options={({ route }) => ({ title: `Tiempo en pantalla — ${route.params.deviceName}` })}
            />
            <Stack.Screen
              name="AppRules"
              component={AppRulesScreen}
              options={({ route }) => ({ title: `Reglas de apps — ${route.params.deviceName}` })}
            />
            <Stack.Screen
              name="Schedules"
              component={SchedulesScreen}
              options={({ route }) => ({ title: `Horarios — ${route.params.deviceName}` })}
            />
            <Stack.Screen
              name="Screenshots"
              component={ScreenshotsScreen}
              options={({ route }) => ({ title: `Capturas — ${route.params.deviceName}` })}
            />
            <Stack.Screen
              name="Contacts"
              component={ContactsScreen}
              options={({ route }) => ({ title: `Contactos — ${route.params.deviceName}` })}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
