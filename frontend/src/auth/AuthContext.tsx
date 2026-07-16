import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react'
import type { ReactNode } from 'react'
import api from '../services/api'
import type { User, Wrapped } from '../types'

interface AuthValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (
    name: string, email: string,
    password: string, passwordConfirmation: string,
  ) => Promise<void>
  logout: () => Promise<void>
  applyUser: (user: User) => void
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<Wrapped<User>>('/auth/user')
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<Wrapped<User>>('/auth/login', { email, password })
    setUser(res.data)
  }, [])

  const register = useCallback(async (
    name: string, email: string,
    password: string, passwordConfirmation: string,
  ) => {
    const res = await api.post<Wrapped<User>>('/auth/register', {
      name, email, password, password_confirmation: passwordConfirmation,
    })
    setUser(res.data)
  }, [])

  const applyUser = useCallback((u: User) => setUser(u), [])

  const logout = useCallback(async () => {
    await api.post('/auth/logout', {})
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, register, logout, applyUser }),
    [user, loading, login, register, logout, applyUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
