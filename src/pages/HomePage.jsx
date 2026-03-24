import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { getMezzi, getDashboard, prendiMezzo, depositaMezzo, creaPrenotazione, getFasceOrarie, convertisciPrenotazioni, getFotoUrl } from '../api/client'
import { useToast } from '../hooks/useToast'

const SL = { free: 'Libero', occupied: 'In uso', booked: 'Prenotato' }

export default function HomePage() {
  const { user } = useAuth()
  const { showToast, ToastEl } = useToast()

  const [mezzi, setMezzi] = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('grid')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modal, setModal] = useState(null) // { mezzo, action: 'detail'|'prenota' }
  const [fasceOrarie, setFasceOrarie] = useState([])
  const [prenotaForm, setPrenotaForm] = useState({ data: '', fasciaOraria: '' })
  const [actionLoading, setActionLoading] = useState(false)

  const load = useCallback(async () => {
    try {
      const [mRes, dRes] = await Promise.all([getMezzi(), getDashboard()])
      setMezzi(mRes.data)
      setDashboard(dRes.data)
    } catch {
      showToast('Errore nel caricamento dei dati', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    // Converti prenotazioni attive all'avvio (come l'app originale)
    convertisciPrenotazioni().catch(() => {})
    getFasceOrarie().then(r => setFasceOrarie(r.data)).catch(() => {})
    // Ricarica ogni 60 secondi
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [load])

  const filtered = mezzi.filter(m => {
    const matchSearch = !search ||
      m.descrizione?.toLowerCase().includes(search.toLowerCase()) ||
      m.targa?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || m.stato === statusFilter
    return matchSearch && matchStatus
  })

  const handlePrendi = async (m) => {
    if (!user) { showToast('Devi essere loggato', 'error'); return }
    setActionLoading(true)
    try {
      const res = await prendiMezzo(m.id, getUserId())
      if (res.data.avviso) showToast(res.data.avviso, 'warn', 6000)
      else showToast(`Mezzo ${m.descrizione} preso con successo!`, 'success')
      setModal(null)
      await load()
    } catch (err) {
      showToast(err.response?.data?.message || 'Errore nella presa del mezzo', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeposita = async (m) => {
    setActionLoading(true)
    try {
      const res = await depositaMezzo(m.id, getUserId())
      showToast(res.data.messaggio || 'Mezzo restituito!', 'success')
      setModal(null)
      await load()
    } catch (err) {
      showToast(err.response?.data?.message || 'Errore nella restituzione', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handlePrenota = async () => {
    if (!prenotaForm.data || !prenotaForm.fasciaOraria) {
      showToast('Compila data e fascia oraria', 'error'); return
    }
    setActionLoading(true)
    try {
      await creaPrenotazione({
        idMezzo: modal.mezzo.id,
        idUtente: getUserId(),
        data: prenotaForm.data,
        fasciaOraria: parseInt(prenotaForm.fasciaOraria)
      })
      showToast('Prenotazione creata!', 'success')
      setModal(null)
      setPrenotaForm({ data: '', fasciaOraria: '' })
      await load()
    } catch (err) {
      showToast(err.response?.data?.message || 'Errore nella prenotazione', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // Recupera l'ID utente dal token JWT decodificato
  const getUserId = () => {
    const token = localStorage.getItem('mezzi_token')
    if (!token) return 0
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return parseInt(payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || payload.sub || 0)
    } catch { return 0 }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <>
      {ToastEl}

      {/* HEADER */}
      <div className="ph">
        <div>
          <div className="pt">Parco Mezzi</div>
          <div className="ps">{mezzi.length} veicoli · aggiornato adesso</div>
        </div>
        <div className="pa">
          <div className="legend">
            <div className="li"><div className="ld" style={{background:'var(--green)'}}></div>Libero</div>
            <div className="li"><div className="ld" style={{background:'var(--red)'}}></div>In uso</div>
            <div className="li"><div className="ld" style={{background:'var(--amber)'}}></div>Prenotato</div>
          </div>
        </div>
      </div>

      {/* STATS */}
      {dashboard && (
        <div className="stats">
          <div className="stat">
            <div className="slabel"><div className="sdot" style={{background:'var(--green)'}}></div>Liberi ora</div>
            <div className="sval">{dashboard.mezziLiberi}<span className="sunit">mezzi</span></div>
          </div>
          <div className="stat">
            <div className="slabel"><div className="sdot" style={{background:'var(--red)'}}></div>In uso</div>
            <div className="sval">{dashboard.mezziInUso}<span className="sunit">mezzi</span></div>
          </div>
          <div className="stat">
            <div className="slabel"><div className="sdot" style={{background:'var(--amber)'}}></div>Prenotati</div>
            <div className="sval">{dashboard.mezziPrenotati}<span className="sunit">mezzi</span></div>
          </div>
          <div className="stat">
            <div className="slabel">Parco totale</div>
            <div className="sval">{dashboard.totaleMezzi}<span className="sunit">veicoli</span></div>
          </div>
        </div>
      )}

      {/* FILTERS */}
      <div className="fb">
        <div className="sw">
          <svg className="sico" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input className="sinput" placeholder="Cerca nome o targa..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="sfbg">
          <button className={'sfb' + (!statusFilter ? ' af' : '')} onClick={() => setStatusFilter('')}>Tutti</button>
          <button className={'sfb' + (statusFilter==='free' ? ' ag' : '')} onClick={() => setStatusFilter('free')}><div className="sfd" style={{background:'var(--green)'}}></div>Liberi</button>
          <button className={'sfb' + (statusFilter==='occupied' ? ' ar' : '')} onClick={() => setStatusFilter('occupied')}><div className="sfd" style={{background:'var(--red)'}}></div>In uso</button>
          <button className={'sfb' + (statusFilter==='booked' ? ' aa' : '')} onClick={() => setStatusFilter('booked')}><div className="sfd" style={{background:'var(--amber)'}}></div>Prenotati</button>
        </div>
        <div className="fsp" />
        <div className="vtg">
          <button className={'vtb' + (view==='grid' ? ' active' : '')} onClick={() => setView('grid')}>
            <svg viewBox="0 0 16 16"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>
          </button>
          <button className={'vtb' + (view==='list' ? ' active' : '')} onClick={() => setView('list')}>
            <svg viewBox="0 0 16 16"><rect x="1" y="2" width="14" height="3" rx="1"/><rect x="1" y="7" width="14" height="3" rx="1"/><rect x="1" y="12" width="14" height="3" rx="1"/></svg>
          </button>
        </div>
      </div>

      {/* GRID */}
      {loading ? <div className="spinner" /> : (
        filtered.length === 0 ? (
          <div className="empty">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>
            <p>Nessun mezzo trovato</p>
          </div>
        ) : view === 'grid' ? (
          <div className="grid">
            {filtered.map((m, i) => (
              <div key={m.id} className={`vc ${m.stato}`} style={{animationDelay: `${i * 0.04}s`}} onClick={() => setModal({ mezzo: m, action: 'detail' })}>
                <div className="viw">
                  <div className="vib" style={m.hasImmagine ? {backgroundImage:`url(${getFotoUrl(m.id)})`} : {}} />
                  <span className="vnum">#{m.numeroAutoMezzo ?? m.id}</span>
                  <span className={`vst ${m.stato}`}>{SL[m.stato]}</span>
                  <div className="vplate">{m.targa}</div>
                </div>
                <div className="vbody">
                  <div className="vname">{m.descrizione}</div>
                  <div className="vmeta">
                    <div className="vseats">
                      <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                      {m.posti} posti
                    </div>
                    {m.tesseriniFerrero && <div className="vfer">Ferrero</div>}
                  </div>
                  {m.utenteCorrente
                    ? <div className="vuser">→ <strong>{m.utenteCorrente}</strong></div>
                    : <div className="vavail">✓ Disponibile</div>
                  }
                  <div className="vacts" onClick={e => e.stopPropagation()}>
                    {m.stato === 'free' && <>
                      <button className="vbtn g" onClick={() => handlePrendi(m)} disabled={actionLoading}>
                        <svg viewBox="0 0 24 24"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
                        Prendi
                      </button>
                      <button className="vbtn p" onClick={() => { setModal({ mezzo: m, action: 'prenota' }); setPrenotaForm({ data: today, fasciaOraria: '' }) }}>
                        <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                        Prenota
                      </button>
                    </>}
                    {m.stato === 'occupied' && (
                      <button className="vbtn r w" onClick={() => handleDeposita(m)} disabled={actionLoading}>
                        <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                        Restituisci
                      </button>
                    )}
                    {m.stato === 'booked' && (
                      <button className="vbtn w">
                        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                        Prenotazione attiva
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid lv">
            {filtered.map((m, i) => (
              <div key={m.id} className={`vrow ${m.stato}`} style={{animationDelay: `${i * 0.03}s`}} onClick={() => setModal({ mezzo: m, action: 'detail' })}>
                <div className="vri" style={m.hasImmagine ? {backgroundImage:`url(${getFotoUrl(m.id)})`} : {}} />
                <div className="vrc">
                  <span className="vrn">#{m.numeroAutoMezzo ?? m.id}</span>
                  <span className="vrname">{m.descrizione}</span>
                  <span className="vrp">{m.targa}</span>
                  <span className="vru">{m.utenteCorrente || '—'}</span>
                  <span className={`vrs ${m.stato}`}>{SL[m.stato]}</span>
                </div>
                <div className="vra" onClick={e => e.stopPropagation()}>
                  {m.stato === 'free' && <>
                    <button className="vrb g" onClick={() => handlePrendi(m)} disabled={actionLoading}>Prendi</button>
                    <button className="vrb p" onClick={() => { setModal({ mezzo: m, action: 'prenota' }); setPrenotaForm({ data: today, fasciaOraria: '' }) }}>Prenota</button>
                  </>}
                  {m.stato === 'occupied' && <button className="vrb r" onClick={() => handleDeposita(m)} disabled={actionLoading}>Restituisci</button>}
                  {m.stato === 'booked' && <button className="vrb" onClick={() => setModal({ mezzo: m, action: 'detail' })}>Dettaglio</button>}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* MODAL DETTAGLIO */}
      {modal?.action === 'detail' && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{width: 480}} onClick={e => e.stopPropagation()}>
            <button className="mcl" onClick={() => setModal(null)}>✕</button>
            <div className="mt">{modal.mezzo.descrizione}</div>
            <div style={{height: 130, borderRadius: 10, background: 'var(--ink3)', marginBottom: 18, backgroundImage: modal.mezzo.hasImmagine ? `url(${getFotoUrl(modal.mezzo.id)})` : 'none', backgroundSize:'cover', backgroundPosition:'center'}} />
            <div className="mgrid">
              <div className="mf"><label>Targa</label><div className="v"><span className="pb">{modal.mezzo.targa}</span></div></div>
              <div className="mf"><label>Posti</label><div className="v">{modal.mezzo.posti} posti</div></div>
              <div className="mf"><label>Stato</label><div className="v"><span className={`badge ${modal.mezzo.stato}`}><span className="bdot" />{SL[modal.mezzo.stato]}</span></div></div>
              <div className="mf"><label>Tipo</label><div className="v">{modal.mezzo.tipoDescrizione || '—'}</div></div>
            </div>
            {modal.mezzo.utenteCorrente && (
              <div className="mf" style={{marginBottom: 0}}>
                <label>Attualmente con</label>
                <div className="v" style={{color: 'var(--accent)'}}>{modal.mezzo.utenteCorrente}</div>
              </div>
            )}
            <div className="mac">
              <button className="btn btng btns" onClick={() => setModal(null)}>Chiudi</button>
              {modal.mezzo.stato === 'free' && <>
                <button className="btn btnsu btns" onClick={() => handlePrendi(modal.mezzo)} disabled={actionLoading}>Prendi mezzo</button>
                <button className="btn btnp btns" onClick={() => setModal({ ...modal, action: 'prenota' })}>Prenota</button>
              </>}
              {modal.mezzo.stato === 'occupied' && (
                <button className="btn btnd btns" onClick={() => handleDeposita(modal.mezzo)} disabled={actionLoading}>Restituisci</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRENOTA */}
      {modal?.action === 'prenota' && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="mcl" onClick={() => setModal(null)}>✕</button>
            <div className="mt">Prenota — {modal.mezzo.descrizione}</div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div className="mf">
                <label>Data</label>
                <input type="date" className="mi" min={today} value={prenotaForm.data} onChange={e => setPrenotaForm(p => ({...p, data: e.target.value}))} />
              </div>
              <div className="mf">
                <label>Fascia oraria</label>
                <select className="mi" value={prenotaForm.fasciaOraria} onChange={e => setPrenotaForm(p => ({...p, fasciaOraria: e.target.value}))}>
                  <option value="">Seleziona...</option>
                  {fasceOrarie.map(f => <option key={f.id} value={f.id}>{f.descrizione}</option>)}
                </select>
              </div>
            </div>
            <div className="mac">
              <button className="btn btng" onClick={() => setModal(null)}>Annulla</button>
              <button className="btn btnp" onClick={handlePrenota} disabled={actionLoading || !prenotaForm.data || !prenotaForm.fasciaOraria}>
                {actionLoading ? 'Salvataggio...' : 'Conferma prenotazione'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
