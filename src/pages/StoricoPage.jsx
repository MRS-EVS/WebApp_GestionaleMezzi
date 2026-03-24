import { useState, useEffect } from 'react'
import { getStorico } from '../api/client'
import { useToast } from '../hooks/useToast'

export default function StoricoPage() {
  const { showToast, ToastEl } = useToast()
  const [storico, setStorico] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    getStorico()
      .then(r => setStorico(r.data))
      .catch(() => showToast('Errore nel caricamento storico', 'error'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = storico.filter(r =>
    !search ||
    r.nomeUtente?.toLowerCase().includes(search.toLowerCase()) ||
    r.descrizioneMezzo?.toLowerCase().includes(search.toLowerCase()) ||
    r.targa?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      {ToastEl}
      <div className="ph">
        <div>
          <div className="pt">Storico Depositi</div>
          <div className="ps">Registro completo prese e restituzioni</div>
        </div>
      </div>

      <div className="fb">
        <div className="sw">
          <svg className="sico" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input className="sinput" placeholder="Cerca utente o mezzo..." value={search} onChange={e => setSearch(e.target.value)} />
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
