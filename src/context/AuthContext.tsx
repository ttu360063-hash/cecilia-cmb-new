import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  clearSessionStorage,
  fetchCurrentUser,
  getStoredToken,
  getStoredUser,
  loginWithPassword,
  onAuthUserUpdated,
  Permission,
  setStoredToken,
  setStoredUser,
  type AuthUser,
} from '../lib/auth'

type AuthContextValue = {
  loading: boolean
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  refreshSession: () => Promise<void>
  hasPermission: (permission: Permission) => boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<AuthUser | null>(getStoredUser())
  const [token, setToken] = useState<string | null>(getStoredToken())

  const logout = useCallback(() => {
    clearSessionStorage()
    setUser(null)
    setToken(null)
  }, [])

  const refreshSession = useCallback(async () => {
    const currentToken = getStoredToken()
    if (!currentToken) {
      setUser(null)
      setToken(null)
      setLoading(false)
      return
    }

    try {
      const response = await fetchCurrentUser()
      setUser(response.user)
      setToken(currentToken)
      setStoredUser(response.user)
    } catch (_error) {
      logout()
    } finally {
      setLoading(false)
    }
  }, [logout])

  useEffect(() => {
    refreshSession()
  }, [refreshSession])

  useEffect(() => {
    const unbind = onAuthUserUpdated((updatedUser) => {
      setUser(updatedUser)
      setToken(getStoredToken())
    })

    return unbind
  }, [])

  useEffect(() => {
    if (!token) {
      return
    }

    const intervalId = window.setInterval(() => {
      refreshSession().catch(() => undefined)
    }, 30_000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [token, refreshSession])

  const login = useCallback(async (username: string, password: string) => {
    const response = await loginWithPassword(username, password)
    setStoredToken(response.token)
    setStoredUser(response.user)
    setToken(response.token)
    setUser(response.user)
  }, [])

  const hasPermission = useCallback(
    (permission: Permission) => {
      if (!user) {
        return false
      }

      if ((user.role || '').toLowerCase() === 'administrador') {
        return true
      }

      return user.permissions.includes(permission)
    },
    [user],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      user,
      token,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
      refreshSession,
      hasPermission,
    }),
    [loading, user, token, login, logout, refreshSession, hasPermission],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>.')
  }
  return context
}
