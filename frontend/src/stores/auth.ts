import { create } from 'zustand'
import type { User } from '@/api/types'
import { getToken, clearToken } from '@/api/http'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  logout: () => void
  checkAuth: () => boolean
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!getToken(),

  setUser: (user) => {
    set({ user, isAuthenticated: !!user })
  },

  logout: () => {
    clearToken()
    set({ user: null, isAuthenticated: false })
  },

  checkAuth: () => {
    const hasToken = !!getToken()
    set({ isAuthenticated: hasToken })
    return hasToken
  },
}))

