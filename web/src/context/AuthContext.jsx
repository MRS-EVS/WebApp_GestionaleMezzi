import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { login as apiLogin } from '../api/client'

const AuthContext = createContext(null)

// Estrae l'ID utente dal token JWT (claim nameidentifier, fallback su sub)
function decodeUserId(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return parseInt(
      payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || payload.sub || 0
    ) || 0
  } catch { return 0 }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('mezzi_user')
    return saved ? JSON.parse(saved) : null
  })

  // Richiesta di login in sospeso — { motivo } — mostrata come modale sopra la pagina corrente
  const [authPrompt, setAuthPrompt] = useState(null)
  const pendingRef = useRef(null)

  // Sblocca l'azione che stava aspettando il login (o la annulla con null)
  const risolviPending = useCallback((value) => {
    const resolve = pendingRef.current
    pendingRef.current = null
    if (resolve) resolve(value)
  }, [])

  const login = useCallback(async (codice, password) => {
    const res = await apiLogin(codice, password)
    const { token, nomeCompleto, livello } = res.data
    const userData = { id: decodeUserId(token), nomeCompleto, livello, codice }
    localStorage.setItem('mezzi_token', token)
    localStorage.setItem('mezzi_user', JSON.stringify(userData))
    setUser(userData)
    setAuthPrompt(null)
    risolviPending(userData)
    return userData
  }, [risolviPending])

  const logout = useCallback(() => {
    localStorage.removeItem('mezzi_token')
    localStorage.removeItem('mezzi_user')
    setUser(null)
  }, [])

  // Token scaduto lato server: si torna anonimi restando sulla pagina corrente
  useEffect(() => {
    const onExpired = () => setUser(null)
    window.addEventListener('auth:expired', onExpired)
    return () => window.removeEventListener('auth:expired', onExpired)
  }, [])

  // Chiede il login SOLO se non si e' gia' autenticati.
  // Risolve con l'utente, oppure con null se l'utente annulla.
  const requireAuth = useCallback((motivo) => {
    if (user) return Promise.resolve(user)
    return new Promise(resolve => {
      risolviPending(null)          // eventuale richiesta precedente rimasta aperta
      pendingRef.current = resolve
      setAuthPrompt({ motivo: motivo || null })
    })
  }, [user, risolviPending])

  const cancelAuth = useCallback(() => {
    setAuthPrompt(null)
    risolviPending(null)
  }, [risolviPending])

  return (
    <AuthContext.Provider value={{
      user, login, logout,
      requireAuth, authPrompt, cancelAuth,
      isAdmin: user?.livello === 999
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
