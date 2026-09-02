import { useState, useEffect } from 'react'
import { getStorico } from '../api/client'
import { useToast } from '../hooks/useToast'

// Converte dd/MM/yyyy → yyyy-MM-dd per confronto stringa diretto
function toYMD(str) {
  if (!str) return null
  if (str.includes('/')) {
    const [d, m, y] = str.split('/')
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
  }
  return str.split('T')[0]
}

export default function StoricoPage() {
  const { showToast, ToastEl } = useToast()
  const [storico, setStorico] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dal, setDal] = useState('')
  const [al, setAl] = useState('')

  // Formatta input in GG/MM/AAAA mentre si digita
  const formatDateInput = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 8)
    if (digits.length <= 2) return digits
    if (digits.length <= 4) return `${digits.slice(0,2)}/${digits.slice(2)}`
    return `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`
  }

  // Converte GG/MM/AAAA → YYYY-MM-DD per il confronto (se data valida)
  const inputToYMD = (val) => {
    if (!val || val.length < 10) return null
    const [d, m, y] = val.split('/')
    if (!d || !m || !y || y.length < 4) return null
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
  }

  useEffect(() => {
    getStorico()
      .then(r => setStorico(r.data))
      .catch(() => showToast('Errore nel caricamento storico', 'error'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = storico.filter(r => {
    if (search) {
      const s = search.toLowerCase()
      const matchText =
        r.nomeUtente?.toLowerCase().includes(s) ||
        r.descrizioneMezzo?.toLowerCase().includes(s) ||
        r.targa?.toLowerCase().includes(s)
      if (!matchText) return false
    }
    if (dal) {
      const ymd = toYMD(r.dataPreso)
      const dalYMD = inputToYMD(dal)
      if (!ymd || !dalYMD || ymd < dalYMD) return false
    }
    if (al) {
      const ymd = toYMD(r.dataPreso)
      const alYMD = inputToYMD(al)
      if (!ymd || !alYMD || ymd > alYMD) return false
    }
    return true
  })

  const resetFiltri = () => { setDal(''); setAl(''); setSearch('') }
  const hasFiltri = search || dal || al

  return (
    <>
      {ToastEl}
      <div className="ph">
        <div>
          <div className="pt">Storico Depositi</div>
          <div className="ps">Registro completo prese e restituzioni</div>
        </div>
      </div>

      <div className="fb" style={{flexWrap:'wrap', gap:8}}>
        <div className="sw">
          <svg className="sico" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input className="sinput" placeholder="Cerca utente o mezzo..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{display:'flex', alignItems:'center', gap:6, flexWrap:'wrap'}}>
          <span style={{fontSize:12, color:'var(--text3)', whiteSpace:'nowrap'}}>Dal</span>
          <input
            type="text"
            className="mi"
            placeholder="GG/MM/AAAA"
            inputMode="numeric"
            style={{width:130}}
            value={dal}
            onChange={e => setDal(formatDateInput(e.target.value))}
          />
          <span style={{fontSize:12, color:'var(--text3)', whiteSpace:'nowrap'}}>Al</span>
          <input
            type="text"
            className="mi"
            placeholder="GG/MM/AAAA"
            inputMode="numeric"
            style={{width:130}}
            value={al}
            onChange={e => setAl(formatDateInput(e.target.value))}
          />
          {hasFiltri && (
            <button className="btn btng btns" onClick={resetFiltri}>
              <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
              Resetta
            </button>
          )}
        </div>
      </div>

      {loading ? <div className="spinner" /> : filtered.length === 0 ? (
        <div className="empty">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
          <p>Nessun record trovato</p>
        </div>
      ) : (
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Mezzo</th><th>Utente</th>
                <th>Data presa</th><th>Ora</th>
                <th>Data deposito</th><th>Ora</th><th>Durata</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td className="m">{r.idMezzo}</td>
                  <td><strong>{r.descrizioneMezzo}</strong></td>
                  <td>{r.nomeUtente}</td>
                  <td className="m">{r.dataPreso}</td>
                  <td><span className="tc">{r.oraPreso}</span></td>
                  <td className="m">{r.dataDeposito}</td>
                  <td><span className="tc">{r.oraDeposito}</span></td>
                  <td className="m" style={{color:'var(--text3)'}}>{r.durataOre || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
