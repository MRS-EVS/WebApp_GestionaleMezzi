import { createContext, useContext, useState, useCallback } from 'react'
import { login as apiLogin } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('mezzi_user')
    return saved ? JSON.parse(saved) : null
  })

  const login = useCallback(async (codice) => {
    const res = await apiLogin(codice)
    const { token, nomeCompleto, livello } = res.data
    const userData = { nomeCompleto, livello, codice }
    localStorage.setItem('mezzi_token', token)
    localStorage.setItem('mezzi_user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('mezzi_token')
    localStorage.removeItem('mezzi_user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin: user?.livello === 1 }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
