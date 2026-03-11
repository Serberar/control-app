import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AuthUser } from '../types'
import { api } from '../services/ApiService'
import { wsService } from '../services/WebSocketService'

interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean

  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const { tokens, user } = await api.login(email, password)
    await api.saveTokens(tokens)
    await AsyncStorage.setItem('user', JSON.stringify(user))
    set({ user, isAuthenticated: true })
    await wsService.connect()
  },

  logout: async () => {
    await api.clearTokens()
    await AsyncStorage.removeItem('user')
    wsService.disconnect()
    set({ user: null, isAuthenticated: false })
  },

  checkAuth: async () => {
    try {
      const [token, userJson] = await AsyncStorage.multiGet(['accessToken', 'user'])
      const hasToken = !!token[1]
      const user = userJson[1] ? (JSON.parse(userJson[1]) as AuthUser) : null
      if (hasToken && user) {
        set({ user, isAuthenticated: true })
        await wsService.connect()
      }
    } finally {
      set({ isLoading: false })
    }
  },
}))
