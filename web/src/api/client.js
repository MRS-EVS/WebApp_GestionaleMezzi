import axios from 'axios'

// ── CONFIGURAZIONE ──
// Con il proxy Vite, le chiamate /api vengono inoltrate al backend automaticamente.
// Non serve specificare l'IP — funziona da qualsiasi dispositivo in rete.
export const API_BASE_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

// Inietta il token JWT in ogni richiesta automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mezzi_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Se il server risponde 401 il token e' scaduto/non valido: azzera le credenziali
// e segnala l'evento all'app. NIENTE redirect forzato: l'app resta navigabile da
// anonimo (parco mezzi, restituzione) e il login viene chiesto solo quando serve.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || ''
    const isAuthCall = url.includes('/auth/')
    if (err.response?.status === 401 && !isAuthCall) {
      localStorage.removeItem('mezzi_token')
      localStorage.removeItem('mezzi_user')
      window.dispatchEvent(new CustomEvent('auth:expired'))
    }
    return Promise.reject(err)
  }
)

// ── AUTH ──
export const login = (codice, password) =>
  api.post('/api/auth/login', { codice, password: password || null })

export const getUtentiLogin = () =>
  api.get('/api/auth/utenti-login')

// ── MEZZI ──
export const getMezzi = (soloAbilitati = true) =>
  api.get('/api/mezzi', { params: { soloAbilitati } })

export const getMezzo = (id) =>
  api.get(`/api/mezzi/${id}`)

export const getDashboard = () =>
  api.get('/api/mezzi/dashboard')

export const creaMezzo = (data) =>
  api.post('/api/mezzi', data)

export const aggiornaMezzo = (id, data) =>
  api.patch(`/api/mezzi/${id}`, data)

export const prendiMezzo = (idMezzo, idUtente) =>
  api.post(`/api/mezzi/${idMezzo}/prendi`, { idMezzo, idUtente })

export const depositaMezzo = (idMezzo, idUtente) =>
  api.post(`/api/mezzi/${idMezzo}/deposita`, { idMezzo, idUtente })

export const convertisciPrenotazioni = () =>
  api.post('/api/mezzi/converti-prenotazioni')

// ── PRENOTAZIONI ──
export const getPrenotazioni = (da) =>
  api.get('/api/prenotazioni', { params: da ? { da } : {} })

export const creaPrenotazione = (data) =>
  api.post('/api/prenotazioni', data)

// Prenotazione di un periodo: { idMezzo, idUtente, dataInizio, dataFine, fasciaOraria }
// Il backend crea una riga per ogni giorno del periodo, o nessuna se c'e' conflitto.
export const creaPrenotazionePeriodo = (data) =>
  api.post('/api/prenotazioni/periodo', data)

export const eliminaPrenotazione = (id) =>
  api.delete(`/api/prenotazioni/${id}`)

// ── STORICO ──
export const getStorico = (params = {}) =>
  api.get('/api/storico', { params })

// ── UTENTI ──
export const getUtenti = () =>
  api.get('/api/utenti')

export const creaUtente = (data) =>
  api.post('/api/utenti', data)

export const aggiornaUtente = (id, data) =>
  api.patch(`/api/utenti/${id}`, data)

export const eliminaUtente = (id) =>
  api.delete(`/api/utenti/${id}`)

export const cambiaPasswordMia = (passwordCorrente, nuovaPassword) =>
  api.post('/api/utenti/me/password', { passwordCorrente, nuovaPassword })

// ── MANUTENZIONI ──
export const getManutenzioni = (idMezzo) =>
  api.get('/api/manutenzioni', { params: idMezzo ? { idMezzo } : {} })

export const creaManutenzione = (data) =>
  api.post('/api/manutenzioni', data)

// ── LOOKUP ──
export const getFasceOrarie = () => api.get('/api/lookup/fasce-orarie')
export const getTipologieMezzo = () => api.get('/api/lookup/tipologie-mezzo')
export const getTipiManutenzione = () => api.get('/api/lookup/tipi-manutenzione')

export default api

// ── IMMAGINI ──
export const getFotoUrl = (idMezzo) =>
  `${API_BASE_URL}/api/immagini/mezzo/${idMezzo}`

export const uploadFoto = (idMezzo, file) => {
  const form = new FormData()
  form.append('file', file)
  return api.post(`/api/immagini/mezzo/${idMezzo}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export const eliminaFoto = (idMezzo) =>
  api.delete(`/api/immagini/mezzo/${idMezzo}`)
