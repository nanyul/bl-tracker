import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authService } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const checkAuth = useCallback(async () => {
    if (authService.isAuthenticated()) {
      const userData = authService.getUser()
      setUser(userData)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const login = async (email, password) => {
    try {
      const { user: userData } = await authService.login(email, password)
      setUser(userData)
      return { success: true, user: userData }
    } catch (err) {
      return { success: false, error: err.data?.message || err.message || 'No se pudo iniciar sesión' }
    }
  }

  const register = async (formData) => {
    try {
      const { name, email, password } = formData
      const { user: userData } = await authService.register(name, email, password)
      setUser(userData)
      return { success: true, user: userData }
    } catch (err) {
      return { success: false, error: err.data?.message || err.message || 'No se pudo completar el registro' }
    }
  }

  const logout = () => {
    authService.logout()
    setUser(null)
  }

  const updateUser = (userData) => {
    setUser(userData)
    localStorage.setItem('bl_user', JSON.stringify(userData))
  }

  const refreshProfile = async () => {
    try {
      const { userService } = await import('../services/api')
      const fresh = await userService.getProfile()
      const userData = fresh.user || fresh
      updateUser(userData)
      return userData
    } catch { return null }
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    refreshProfile,
    isAuthenticated: !!user,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}