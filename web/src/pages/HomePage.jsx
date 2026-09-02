import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { getMezzi, getDashboard, prendiMezzo, depositaMezzo, creaPrenotazione, getFasceOrarie, getFotoUrl } from '../api/client'
import { useToast } from '../hooks/useToast'
import { useMezziRealtime } from '../hooks/useMezziRealtime'

const SL = { free: 'Libero', occupied: 'In uso', booked: 'Prenotato' }

const formatBookingDate = (value) => {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  return year && month && day ? `${day}/${month}/${year}` : value
}

const bookingDescription = (booking) => [
  formatBookingDate(booking?.data),
  booking?.fasciaOrariaDescrizione,
  booking?.nomeUtente,
].filter(Boolean).join(' · ')

export default function HomePage() {
  const { requireAuth } = useAuth()
  const { showToast, ToastEl } = useToast()

  const [mezzi, setMezzi] = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('grid')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modal, setModal] = useState(null) // { mezzo, action: 'detail'|'prenota' }
  const [confirm, setConfirm] = useState(null) // { action: 'prendi'|'deposita', mezzo }
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
    getFasceOrarie().then(r => setFasceOrarie(r.data)).catch(() => {})
    // Ricarica ogni 60 secondi
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [load])

  useMezziRealtime(load)

  // Mantiene aggiornati anche modali e conferme già aperti quando arriva
  // una modifica realtime da un altro dispositivo.
  useEffect(() => {
    setModal(current => {
      if (!current?.mezzo?.id) return current
      const aggiornato = mezzi.find(m => m.id === current.mezzo.id)
      return aggiornato ? { ...current, mezzo: aggiornato } : current
    })
    setConfirm(current => {
      if (!current?.mezzo?.id) return current
      const aggiornato = mezzi.find(m => m.id === current.mezzo.id)
      return aggiornato ? { ...current, mezzo: aggiornato } : current
    })
  }, [mezzi])

  const filtered = mezzi.filter(m => {
    const matchSearch = !search ||
      m.descrizione?.toLowerCase().includes(search.toLowerCase()) ||
      m.targa?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter ||
      (statusFilter === 'booked'
        ? (m.numeroPrenotazioniAttive ?? 0) > 0
        : m.stato === statusFilter)
    return matchSearch && matchStatus
  })

  const handlePrendi = async (m) => {
    const u = await requireAuth(`Accedi per prendere ${m.descrizione}`)
    if (!u) return
    setActionLoading(true)
    try {
      const res = await prendiMezzo(m.id, u.id || getUserId())
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
    const u = await requireAuth(`Accedi per prenotare ${modal.mezzo.descrizione}`)
    if (!u) return
    setActionLoading(true)
    try {
      const res = await creaPrenotazione({
        idMezzo: modal.mezzo.id,
        idUtente: u.id || getUserId(),
        data: prenotaForm.data,
        fasciaOraria: parseInt(prenotaForm.fasciaOraria)
      })
      showToast(
        res.data?.assegnataAutomaticamente
          ? 'Prenotazione di oggi assegnata: il mezzo è ora in uso a tuo nome.'
          : 'Prenotazione creata!',
        'success'
      )
      setModal(null)
      setPrenotaForm({ data: '', fasciaOraria: '' })
      await load()
    } catch (err) {
      showToast(err.response?.data?.message || 'Errore nella prenotazione', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // Prendere e prenotare sono le uniche azioni che richiedono l'accesso:
  // il login viene chiesto al click, poi il flusso prosegue normalmente.
  const chiediPrendi = async (m) => {
    const u = await requireAuth(`Accedi per prendere ${m.descrizione}`)
    if (!u) return
    setConfirm({ action: 'prendi', mezzo: m })
  }

  const apriPrenota = async (m) => {
    const u = await requireAuth(`Accedi per prenotare ${m.descrizione}`)
    if (!u) return
    setPrenotaForm({ data: today, fasciaOraria: '' })
    setModal({ mezzo: m, action: 'prenota' })
  }

  // Recupera l'ID utente dal token JWT decodificato (fallback per sessioni gia' salvate)
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
                  {m.prossimaPrenotazione && (
                    <div className="vbooking" title={`Prenotato: ${bookingDescription(m.prossimaPrenotazione)}`}>
                      <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                      <span><strong>Prenotato</strong> {bookingDescription(m.prossimaPrenotazione)}</span>
                      {m.numeroPrenotazioniAttive > 1 && <em>+{m.numeroPrenotazioniAttive - 1}</em>}
                    </div>
                  )}
                  <div className="vacts" onClick={e => e.stopPropagation()}>
                    {m.stato === 'free' && <>
                      <button className="vbtn p" onClick={() => apriPrenota(m)}>
                        <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                        Prenota
                      </button>
                      <button className="vbtn g" onClick={() => chiediPrendi(m)} disabled={actionLoading}>
                        <svg viewBox="0 0 24 24"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
                        Prendi
                      </button>
                    </>}
                    {m.stato === 'occupied' && <>
                      <button className="vbtn p" onClick={() => apriPrenota(m)}>
                        <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                        Prenota
                      </button>
                      <button className="vbtn r" onClick={() => setConfirm({ action: 'deposita', mezzo: m })} disabled={actionLoading}>
                        <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                        Restituisci
                      </button>
                    </>}
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
                  {m.prossimaPrenotazione && (
                    <span className="vrbooking" title={`Prenotato: ${bookingDescription(m.prossimaPrenotazione)}`}>
                      ◷ {formatBookingDate(m.prossimaPrenotazione.data)}
                      {m.numeroPrenotazioniAttive > 1 && ` +${m.numeroPrenotazioniAttive - 1}`}
                    </span>
                  )}
                  <span className={`vrs ${m.stato}`}>{SL[m.stato]}</span>
                </div>
                <div className="vra" onClick={e => e.stopPropagation()}>
                  {m.stato === 'free' && <>
                    <button className="vrb p" onClick={() => apriPrenota(m)}>Prenota</button>
                    <button className="vrb g" onClick={() => chiediPrendi(m)} disabled={actionLoading}>Prendi</button>
                  </>}
                  {m.stato === 'occupied' && <>
                    <button className="vrb p" onClick={() => apriPrenota(m)}>Prenota</button>
                    <button className="vrb r" onClick={() => setConfirm({ action: 'deposita', mezzo: m })} disabled={actionLoading}>Restituisci</button>
                  </>}
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
          <div className="modal mdetail" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              className="mcl"
              onClick={() => setModal(null)}
              aria-label="Chiudi dettaglio mezzo"
              title="Chiudi"
            >✕</button>

            {/* FOTO CON OVERLAY */}
            <div className="mhero">
              <div className="mhero-img" style={modal.mezzo.hasImmagine ? {backgroundImage:`url(${getFotoUrl(modal.mezzo.id)})`} : {}} />
              <div className="mhero-overlay" />
              <span className="mhero-num">#{modal.mezzo.numeroAutoMezzo ?? modal.mezzo.id}</span>
              <span className={`vst ${modal.mezzo.stato}`}>{SL[modal.mezzo.stato]}</span>
              <div className="mhero-bottom">
                <div className="mhero-name">{modal.mezzo.descrizione}</div>
                <div className="vplate" style={{position:'relative',transform:'none',bottom:'auto',left:'auto'}}>{modal.mezzo.targa}</div>
              </div>
            </div>

            {/* DETTAGLI */}
            <div className="mdetail-body">
              <div className="mgrid">
                <div className="mf"><label>Posti</label><div className="v">{modal.mezzo.posti} posti</div></div>
                <div className="mf"><label>Tipo</label><div className="v">{modal.mezzo.tipoDescrizione || '—'}</div></div>
                {modal.mezzo.tesseriniFerrero && (
                  <div className="mf" style={{gridColumn:'1/-1'}}>
                    <label>Badge</label>
                    <div className="v"><span className="vfer">Ferrero</span></div>
                  </div>
                )}
              </div>
              {modal.mezzo.utenteCorrente && (
                <div className="mf">
                  <label>Attualmente con</label>
                  <div className="v" style={{color:'var(--accent)',fontWeight:600}}>{modal.mezzo.utenteCorrente}</div>
                </div>
              )}
              {modal.mezzo.prossimaPrenotazione && (
                <div className="mbooking">
                  <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                  <div>
                    <label>Prossima prenotazione</label>
                    <strong>{bookingDescription(modal.mezzo.prossimaPrenotazione)}</strong>
                    {modal.mezzo.numeroPrenotazioniAttive > 1 && (
                      <small>Altre {modal.mezzo.numeroPrenotazioniAttive - 1} prenotazioni successive</small>
                    )}
                  </div>
                </div>
              )}
              {modal.mezzo.stato !== 'booked' && (
                <div className="mdetail-actions">
                  {modal.mezzo.stato === 'free' && <>
                    <button type="button" className="vbtn p mdetail-action" onClick={() => apriPrenota(modal.mezzo)}>
                      <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                      Prenota
                    </button>
                    <button type="button" className="vbtn g mdetail-action mdetail-take" onClick={() => { const m = modal.mezzo; setModal(null); chiediPrendi(m) }} disabled={actionLoading}>
                      <svg viewBox="0 0 24 24"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
                      Prendi
                    </button>
                  </>}
                  {modal.mezzo.stato === 'occupied' && (
                    <>
                      <button type="button" className="vbtn p mdetail-action" onClick={() => apriPrenota(modal.mezzo)}>
                        <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                        Prenota
                      </button>
                      <button type="button" className="vbtn r mdetail-action mdetail-return" onClick={() => { setModal(null); setConfirm({ action: 'deposita', mezzo: modal.mezzo }) }} disabled={actionLoading}>
                        <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                        Restituisci
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFERMA PRENDI / RESTITUISCI */}
      {confirm && (
        <div className="overlay" onClick={() => setConfirm(null)}>
          <div className="modal" style={{width:360}} onClick={e => e.stopPropagation()}>
            <button className="mcl" onClick={() => setConfirm(null)}>✕</button>
            <div className="mt">
              {confirm.action === 'prendi' ? 'Prendere il mezzo?' : 'Restituire il mezzo?'}
            </div>
            <p style={{fontSize:14, color:'var(--text2)', marginBottom:20}}>
              {confirm.action === 'prendi'
                ? <>Confermi di voler prendere <strong>{confirm.mezzo.descrizione}</strong>?</>
                : <>Confermi la restituzione di <strong>{confirm.mezzo.descrizione}</strong>?</>
              }
            </p>
            <div className="mac">
              <button className="btn btng" onClick={() => setConfirm(null)}>Annulla</button>
              <button
                className={`btn ${confirm.action === 'prendi' ? 'btnsu' : 'btnd'}`}
                disabled={actionLoading}
                onClick={async () => {
                  const m = confirm.mezzo
                  setConfirm(null)
                  if (confirm.action === 'prendi') await handlePrendi(m)
                  else await handleDeposita(m)
                }}
              >
                {actionLoading ? 'In corso...' : confirm.action === 'prendi' ? 'Sì, prendo' : 'Sì, restituisco'}
              </button>
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
