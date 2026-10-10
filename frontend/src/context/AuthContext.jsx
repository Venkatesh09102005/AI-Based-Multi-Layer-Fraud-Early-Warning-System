import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../services/api'

const TOKEN_STORAGE_KEY = 'fws_access_token'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    const verifyToken = async () => {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY)
      if (!storedToken) {
        setIsInitializing(false)
        return
      }

      try {
        const userData = await api.getMe(storedToken)
        setToken(storedToken)
        setUser(userData)
      } catch (err) {
        console.warn('Session verification failed:', err)
        localStorage.removeItem(TOKEN_STORAGE_KEY)
        setToken(null)
        setUser(null)
      } finally {
        setIsInitializing(false)
      }
    }

    verifyToken()
  }, [])

  const login = async (email, password) => {
    const res = await api.login(email, password)
    if (res && res.access_token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, res.access_token)
      setToken(res.access_token)
      setUser(res.user)
      return res.user
    }
    throw new Error('Invalid login response from server')
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    setToken(null)
    setUser(null)
  }

  const handleUnauthorized = () => {
    console.warn('Unauthorized request - clearing token')
    logout()
  }

  const value = {
    token,
    user,
    isAuthenticated: Boolean(token && user),
    isInitializing,
    login,
    logout,
    handleUnauthorized,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
