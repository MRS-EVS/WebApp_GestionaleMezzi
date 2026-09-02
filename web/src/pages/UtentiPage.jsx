import { useState, useEffect } from 'react'
import { getUtenti, creaUtente, aggiornaUtente, eliminaUtente } from '../api/client'
import { useToast } from '../hooks/useToast'

// Genera codice numerico a 4 cifre unico — se già usato incrementa
function generaCodice(nome, cognome, utentiEsistenti = [], excludeId = null) {
  const normalizza = s => s.trim().toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/g, '')
  const str = normalizza(cognome) + normalizza(nome)
  if (!str) return ''
  let h = 0
  for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const base = h % 9000 + 1000

  const usati = new Set(
    utentiEsistenti
      .filter(u => u.id !== excludeId)
      .map(u => u.codice?.trim())
  )

  let candidato = base
  while (usati.has(String(candidato))) {
    candidato = candidato >= 9999 ? 1000 : candidato + 1
  }
  return String(candidato)
}

const LIVELLI = [
  { value: 100, label: 'Utente' },
  { value: 201, label: 'Supervisore' },
  { value: 999, label: 'Admin' },
]

const labelLivello = v => LIVELLI.find(l => l.value === v)?.label ?? `Livello ${v}`

const formVuoto = { nome: '', cognome: '', codice: '', livello: 100, password: '' }

export default function UtentiPage() {
  const { showToast, ToastEl } = useToast()
  const [utenti, setUtenti] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)   // null | { type: 'new'|'edit', utente? }
  const [form, setForm] = useState(formVuoto)
  const [saving, setSaving] = useState(false)
  const [confirmId, setConfirmId] = useState(null)

  const load = async () => {
    try {
      const r = await getUtenti()
      setUtenti(r.data)
    } catch { showToast('Errore nel caricamento utenti', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openNew = () => {
    setForm(formVuoto)
    setModal({ type: 'new' })
  }

  const openEdit = (u) => {
    setForm({ nome: u.nome ?? '', cognome: u.cognome ?? '', codice: u.codice ?? '', livello: u.livello ?? 100, password: '' })
    setModal({ type: 'edit', utente: u })
  }

  // Auto-genera codice quando cambiano nome o cognome
  const handleNomeCognome = (campo, valore) => {
    setForm(f => {
      const nome    = campo === 'nome'    ? valore : f.nome
      const cognome = campo === 'cognome' ? valore : f.cognome
      const excludeId = modal?.utente?.id ?? null
      const codiceAuto = generaCodice(nome, cognome, utenti, excludeId)
      return { ...f, [campo]: valore, codice: codiceAuto }
    })
  }

  const excludeId = modal?.utente?.id ?? null
  const codiceInUso = form.codice.trim().length > 0 &&
    utenti.some(u => u.id !== excludeId &&
      u.codice?.trim().toLowerCase() === form.codice.trim().toLowerCase())

  const handleSave = async () => {
    if (!form.nome.trim() || !form.cognome.trim() || !form.codice.trim()) {
      showToast('Compila tutti i campi obbligatori', 'error'); return
    }
    if (codiceInUso) {
      showToast('Codice già in uso da un altro utente', 'error'); return
    }
    setSaving(true)
    try {
      const payload = {
        nome: form.nome.trim(),
        cognome: form.cognome.trim(),
        codice: form.codice.trim(),
        livello: parseInt(form.livello),
        password: parseInt(form.livello) >= 201 && form.password.trim() ? form.password.trim() : null
      }
      if (modal.type === 'new') {
        await creaUtente(payload)
        showToast('Utente creato', 'success')
      } else {
        await aggiornaUtente(modal.utente.id, payload)
        showToast('Utente aggiornato', 'success')
      }
      setModal(null)
      load()
    } catch (err) {
      showToast(err.response?.data?.message || 'Errore nel salvataggio', 'error')
    } finally { setSaving(false) }
  }

  const handleElimina = async (id) => {
    try {
      await eliminaUtente(id)
      showToast('Utente eliminato', 'success')
      setConfirmId(null)
      load()
    } catch { showToast('Errore nell\'eliminazione', 'error') }
  }

  return (
    <>
      {ToastEl}

      <div className="ph">
        <div>
          <div className="pt">Gestione Utenti</div>
          <div className="ps">{utenti.length} utenti registrati</div>
        </div>
        <div className="pa">
          <button className="btn btnp btns" onClick={openNew}>
            <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            Nuovo utente
          </button>
        </div>
      </div>

      {loading ? <div className="spinner" /> : utenti.length === 0 ? (
        <div className="empty">
          <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
          <p>Nessun utente</p>
        </div>
      ) : (
        <div className="tw">
          <table>
            <thead>
              <tr><th>Nome</th><th>Cognome</th><th>Codice</th><th>Livello</th><th></th></tr>
            </thead>
            <tbody>
              {utenti.map(u => (
                <tr key={u.id}>
                  <td>{u.nome}</td>
                  <td><strong>{u.cognome}</strong></td>
                  <td><span className="tc" style={{fontSize:13,letterSpacing:'.06em'}}>{u.codice ?? '—'}</span></td>
                  <td>
                    <span className={`badge ${u.livello === 999 ? 'occupied' : u.livello === 201 ? 'booked' : 'free'}`}>
                      <span className="bdot" />{labelLivello(u.livello)}
                    </span>
                  </td>
                  <td>
                    <div style={{display:'flex', gap:6}}>
                      <button className="btn btng btns" onClick={() => openEdit(u)}>Modifica</button>
                      <button className="btn btnd btns" onClick={() => setConfirmId(u.id)}>Elimina</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL CREA / MODIFICA */}
      {modal && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="mcl" onClick={() => setModal(null)}>✕</button>
            <div className="mt">{modal.type === 'new' ? 'Nuovo utente' : `Modifica — ${modal.utente?.nomeCompleto}`}</div>

            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14}}>
              <div className="mf">
                <label>Nome *</label>
                <input className="mi" value={form.nome}
                  onChange={e => handleNomeCognome('nome', e.target.value)} />
              </div>
              <div className="mf">
                <label>Cognome *</label>
                <input className="mi" value={form.cognome}
                  onChange={e => handleNomeCognome('cognome', e.target.value)} />
              </div>
              <div className="mf">
                <label>Codice accesso *</label>
                <input className="mi" value={form.codice}
                  style={codiceInUso ? {borderColor:'var(--red)', boxShadow:'0 0 0 3px rgba(240,78,106,.15)'} : {}}
                  onChange={e => setForm(f => ({...f, codice: e.target.value}))}
                  placeholder="Auto-generato" />
                {codiceInUso
                  ? <span style={{fontSize:11, color:'var(--red)', marginTop:2}}>Codice già in uso</span>
                  : <span style={{fontSize:11, color:'var(--text3)', marginTop:2}}>Modificabile manualmente</span>
                }
              </div>
              <div className="mf">
                <label>Livello</label>
                <select className="mi" value={form.livello}
                  onChange={e => setForm(f => ({...f, livello: parseInt(e.target.value), password: ''}))}>
                  {LIVELLI.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            </div>

            {/* Campo password — solo per supervisori e admin */}
            {form.livello >= 201 && (
              <div className="mf" style={{marginTop:14}}>
                <label>
                  Password
                  {modal.type === 'edit' && (
                    <span style={{fontSize:11,color:'var(--text3)',fontWeight:400,marginLeft:6,textTransform:'none',letterSpacing:0}}>
                      — lascia vuoto per non modificarla
                    </span>
                  )}
                </label>
                <input
                  className="mi"
                  type="password"
                  placeholder={modal.type === 'new' ? 'Imposta password' : 'Nuova password (opzionale)'}
                  value={form.password}
                  onChange={e => setForm(f => ({...f, password: e.target.value}))}
                  autoComplete="new-password"
                />
              </div>
            )}

            <div className="mac">
              <button className="btn btng" onClick={() => setModal(null)}>Annulla</button>
              <button className="btn btnp" onClick={handleSave} disabled={saving || !form.nome || !form.cognome || !form.codice}>
                {saving ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM ELIMINA */}
      {confirmId && (
        <div className="overlay" onClick={() => setConfirmId(null)}>
          <div className="modal" style={{width:360}} onClick={e => e.stopPropagation()}>
            <button className="mcl" onClick={() => setConfirmId(null)}>✕</button>
            <div className="mt">Elimina utente</div>
            <p style={{fontSize:14, color:'var(--text2)', marginBottom:20}}>
              Sei sicuro? L'utente verrà rimosso. Lo storico e le prenotazioni esistenti rimarranno invariati.
            </p>
            <div className="mac">
              <button className="btn btng" onClick={() => setConfirmId(null)}>Annulla</button>
              <button className="btn btnd" onClick={() => handleElimina(confirmId)}>Elimina</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
