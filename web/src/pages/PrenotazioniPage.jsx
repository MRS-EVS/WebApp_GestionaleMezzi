// ── PRENOTAZIONI ──
import { useState, useEffect, useCallback } from 'react'
import { getPrenotazioni, eliminaPrenotazione } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../hooks/useToast'
import { useMezziRealtime } from '../hooks/useMezziRealtime'

export function PrenotazioniPage() {
  const { requireAuth } = useAuth()
  const { showToast, ToastEl } = useToast()
  const [prenotazioni, setPrenotazioni] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await getPrenotazioni()
      setPrenotazioni(res.data)
    } catch { showToast('Errore nel caricamento', 'error') }
    finally { setLoading(false) }
  }, [showToast])

  useEffect(() => { load() }, [load])
  useMezziRealtime(load)

  const handleElimina = async (id) => {
    // La consultazione e' libera, annullare una prenotazione no
    const u = await requireAuth('Accedi per annullare una prenotazione')
    if (!u) return
    try {
      await eliminaPrenotazione(id)
      showToast('Prenotazione annullata', 'success')
      load()
    } catch { showToast('Errore nell\'annullamento', 'error') }
  }

  return (
    <>
      {ToastEl}
      <div className="ph">
        <div>
          <div className="pt">Prenotazioni</div>
          <div className="ps">Prenotazioni attive da oggi in poi</div>
        </div>
      </div>

      {loading ? <div className="spinner" /> : prenotazioni.length === 0 ? (
        <div className="empty">
          <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          <p>Nessuna prenotazione attiva</p>
        </div>
      ) : (
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Mezzo</th><th>Targa</th><th>Data</th>
                <th>Fascia</th><th>Utente</th><th></th>
              </tr>
            </thead>
            <tbody>
              {prenotazioni.map(p => (
                <tr key={p.id}>
                  <td className="m">{p.idMezzo}</td>
                  <td><strong>{p.descrizioneMezzo}</strong></td>
                  <td><span className="pb">{p.targa}</span></td>
                  <td className="m">{p.data}</td>
                  <td><span className="badge booked"><span className="bdot" />{p.fasciaOrariaDescrizione}</span></td>
                  <td>{p.nomeUtente}</td>
                  <td>
                    <button className="btn btnd btns" style={{padding:'5px 10px'}} onClick={() => handleElimina(p.id)}>
                      Annulla
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

export default PrenotazioniPage
