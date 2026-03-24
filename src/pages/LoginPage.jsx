import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getUtentiLogin } from '../api/client'
import logo from '../../LOGO-MRS_white.png'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [utenti, setUtenti] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [codice, setCodice] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingUtenti, setLoadingUtenti] = useState(true)
  const [error, setError] = useState('')

  // Carica la lista utenti all'avvio
  useEffect(() => {
    getUtentiLogin()
      .then(r => setUtenti([...r.data].sort((a, b) => `${a.nome} ${a.cognome}`.localeCompare(`${b.nome} ${b.cognome}`, 'it'))))
      .catch(() => {}) // se fallisce, l'utente inserisce codice manualmente
      .finally(() => setLoadingUtenti(false))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!codice.trim()) {
      setError('Inserisci il tuo codice')
      return
    }
    setLoading(true)
    try {
      await login(codice.trim())
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Codice non valido. Riprova.')
      setCodice('')
    } finally {
      setLoading(false)
    }
  }

  const nomeSelezionato = utenti.find(u => u.id === parseInt(selectedId))
  const nomeDisplay = nomeSelezionato ? `${nomeSelezionato.nome} ${nomeSelezionato.cognome}` : ''

  return (
    <div className="login-page">
      <div className="login-card">
        <img src={logo} alt="MRS" className="login-logo" />
        <div className="login-title">Accedi</div>
        <div className="login-sub">Seleziona il tuo nome e inserisci il codice</div>

        <form onSubmit={handleSubmit}>

          {/* SELEZIONE UTENTE */}
          <div className="form-field">
            <label>Chi sei?</label>
            {loadingUtenti ? (
              <div style={{fontSize:12,color:'var(--text3)',padding:'8px 0'}}>Caricamento utenti...</div>
            ) : utenti.length > 0 ? (
              <select
                className="mi"
                value={selectedId}
                onChange={e => {
                  const id = e.target.value
                  setSelectedId(id)
                  setError('')
                  const found = utenti.find(u => u.id === parseInt(id))
                  setCodice(found?.codice ?? '')
                }}
              >
                <option value="">— Seleziona il tuo nome —</option>
                {utenti.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.nome} {u.cognome}
                  </option>
                ))}
              </select>
            ) : (
              <div style={{fontSize:12,color:'var(--text3)'}}>
                Inserisci direttamente il codice sotto
              </div>
            )}
          </div>

          {/* CODICE */}
          <div className="form-field" style={{marginTop: 4}}>
            <label>
              Codice accesso
              {nomeDisplay && (
                <span style={{color:'var(--accent)',fontWeight:600,marginLeft:6,textTransform:'none',letterSpacing:0}}>
                  — {nomeDisplay}
                </span>
              )}
            </label>
            <input
              className="mi"
              type="text"
              placeholder="Es. 061"
              value={codice}
              onChange={e => { setCodice(e.target.value); setError('') }}
              autoComplete="off"
              inputMode="numeric"
              autoFocus={!loadingUtenti}
            />
            {error && (
              <div className="login-err" style={{display:'flex',alignItems:'center',gap:6}}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                {error}
              </div>
            )}
          </div>

          <button
            className="btn btnp"
            style={{width:'100%', justifyContent:'center', marginTop: 8}}
            type="submit"
            disabled={loading || !codice.trim()}
          >
            {loading ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{animation:'spin .7s linear infinite'}}>
                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/>
                  <path d="M21 12a9 9 0 00-9-9"/>
                </svg>
                Accesso in corso...
              </>
            ) : 'Accedi'}
          </button>
        </form>

      </div>
    </div>
  )
}
