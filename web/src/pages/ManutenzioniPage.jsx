import { useState, useEffect } from 'react'
import { getManutenzioni, creaManutenzione, getMezzi, getTipiManutenzione } from '../api/client'
import { useToast } from '../hooks/useToast'

export default function ManutenzioniPage() {
  const { showToast, ToastEl } = useToast()
  const [manutenzioni, setManutenzioni] = useState([])
  const [mezzi, setMezzi] = useState([])
  const [tipi, setTipi] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ idMezzo: '', dataIntervento: '', aziendaManutentore: '', tipoManutenzioneId: '', descrizionIntervento: '', fattura: '' })
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().split('T')[0]

  const load = async () => {
    try {
      const [mRes, mezziRes, tipiRes] = await Promise.all([getManutenzioni(), getMezzi(false), getTipiManutenzione()])
      setManutenzioni(mRes.data)
      setMezzi(mezziRes.data)
      setTipi(tipiRes.data)
    } catch { showToast('Errore nel caricamento', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await creaManutenzione({ ...form, idMezzo: parseInt(form.idMezzo), dataIntervento: form.dataIntervento })
      showToast('Intervento registrato', 'success')
      setModal(false)
      setForm({ idMezzo: '', dataIntervento: today, aziendaManutentore: '', tipoManutenzioneId: '', descrizionIntervento: '', fattura: '' })
      load()
    } catch { showToast('Errore nel salvataggio', 'error') }
    finally { setSaving(false) }
  }

  return (
    <>
      {ToastEl}
      <div className="ph">
        <div>
          <div className="pt">Manutenzioni</div>
          <div className="ps">Tagliandi, revisioni e riparazioni</div>
        </div>
        <button className="btn btnp btns" onClick={() => { setForm(f => ({...f, dataIntervento: today})); setModal(true) }}>
          <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
          Nuovo intervento
        </button>
      </div>

      {loading ? <div className="spinner" /> : manutenzioni.length === 0 ? (
        <div className="empty">
          <svg viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
          <p>Nessuna manutenzione registrata</p>
          <small style={{fontSize:12,opacity:.6}}>Aggiungi il primo intervento con il tasto in alto</small>
        </div>
      ) : (
        <div className="tw">
          <table>
            <thead>
              <tr><th>Data</th><th>Mezzo</th><th>Tipo</th><th>Azienda</th><th>Descrizione</th><th>Fattura</th></tr>
            </thead>
            <tbody>
              {manutenzioni.map(m => (
                <tr key={m.idIntervento}>
                  <td className="m">{m.dataIntervento}</td>
                  <td><strong>{m.descrizioneMezzo}</strong></td>
                  <td style={{fontSize:12,color:'var(--text2)'}}>{m.tipoManutenzione}</td>
                  <td>{m.aziendaManutentore}</td>
                  <td style={{fontSize:12,color:'var(--text2)',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.descrizione}</td>
                  <td style={{fontSize:12,color:'var(--text3)'}}>{m.fattura || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="mcl" onClick={() => setModal(false)}>✕</button>
            <div className="mt">Nuovo intervento</div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div className="mf">
                <label>Mezzo</label>
                <select className="mi" value={form.idMezzo} onChange={e => setForm(f => ({...f, idMezzo: e.target.value}))}>
                  <option value="">Seleziona mezzo...</option>
                  {mezzi.map(m => <option key={m.id} value={m.id}>{m.descrizione} — {m.targa}</option>)}
                </select>
              </div>
              <div className="mf">
                <label>Data intervento</label>
                <input type="date" className="mi" value={form.dataIntervento} onChange={e => setForm(f => ({...f, dataIntervento: e.target.value}))} />
              </div>
              <div className="mf">
                <label>Tipo manutenzione</label>
                <select className="mi" value={form.tipoManutenzioneId} onChange={e => setForm(f => ({...f, tipoManutenzioneId: e.target.value}))}>
                  <option value="">Seleziona...</option>
                  {tipi.map(t => <option key={t.idTipo} value={t.idTipo}>{t.descrizione}</option>)}
                </select>
              </div>
              <div className="mf">
                <label>Azienda manutentore</label>
                <input className="mi" placeholder="Nome officina..." value={form.aziendaManutentore} onChange={e => setForm(f => ({...f, aziendaManutentore: e.target.value}))} />
              </div>
              <div className="mf">
                <label>Descrizione</label>
                <textarea className="mi" rows={3} placeholder="Dettagli intervento..." style={{resize:'vertical'}} value={form.descrizionIntervento} onChange={e => setForm(f => ({...f, descrizionIntervento: e.target.value}))} />
              </div>
              <div className="mf">
                <label>N° Fattura (opzionale)</label>
                <input className="mi" placeholder="Es. FT-2024-001" value={form.fattura} onChange={e => setForm(f => ({...f, fattura: e.target.value}))} />
              </div>
            </div>
            <div className="mac">
              <button className="btn btng" onClick={() => setModal(false)}>Annulla</button>
              <button className="btn btnp" onClick={handleSave} disabled={saving || !form.idMezzo || !form.dataIntervento}>
                {saving ? 'Salvataggio...' : 'Salva intervento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
