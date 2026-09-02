import { useState, useEffect, useRef } from 'react'
import { getMezzi, aggiornaMezzo, creaMezzo, getTipologieMezzo, uploadFoto, eliminaFoto, getFotoUrl } from '../api/client'
import { useToast } from '../hooks/useToast.jsx'

export function ConfigurazionePage() {
  const { showToast, ToastEl } = useToast()
  const [mezzi, setMezzi] = useState([])
  const [tipologie, setTipologie] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [uploadingId, setUploadingId] = useState(null)
  const fileInputRef = useRef(null)
  const [uploadTargetId, setUploadTargetId] = useState(null)

  const load = async () => {
    try {
      const [mRes, tRes] = await Promise.all([getMezzi(false), getTipologieMezzo()])
      setMezzi(mRes.data)
      setTipologie(tRes.data)
    } catch { showToast('Errore nel caricamento', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openEdit = (m) => {
    setForm({
      descrizione: m.descrizione || '',
      targa: m.targa || '',
      posti: m.posti || '',
      tipo: m.tipo || '',
      abilitazione: m.abilitazione ?? true,
      tesseriniFerrero: m.tesseriniFerrero ?? false,
    })
    setModal({ type: 'edit', mezzo: m })
  }

  const openNew = () => {
    setForm({ descrizione: '', targa: '', posti: '3', tipo: '', abilitazione: true, tesseriniFerrero: false })
    setModal({ type: 'new' })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (modal.type === 'edit') {
        await aggiornaMezzo(modal.mezzo.id, form)
        showToast('Mezzo aggiornato', 'success')
      } else {
        await creaMezzo({ ...form, tipo: parseInt(form.tipo), abilitazione: form.abilitazione })
        showToast('Mezzo aggiunto', 'success')
      }
      setModal(null)
      load()
    } catch { showToast('Errore nel salvataggio', 'error') }
    finally { setSaving(false) }
  }

  const handleUploadClick = (idMezzo) => {
    setUploadTargetId(idMezzo)
    fileInputRef.current.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file || !uploadTargetId) return
    e.target.value = '' // reset input

    setUploadingId(uploadTargetId)
    try {
      await uploadFoto(uploadTargetId, file)
      showToast('Foto caricata!', 'success')
      load()
    } catch (err) {
      showToast(err.response?.data?.message || 'Errore upload foto', 'error')
    } finally {
      setUploadingId(null)
      setUploadTargetId(null)
    }
  }

  const handleEliminaFoto = async (idMezzo) => {
    try {
      await eliminaFoto(idMezzo)
      showToast('Foto eliminata', 'success')
      load()
    } catch { showToast('Errore eliminazione foto', 'error') }
  }

  return (
    <>
      {ToastEl}
      {/* Input file nascosto */}
      <input
        type="file"
        ref={fileInputRef}
        style={{display:'none'}}
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
      />

      <div className="ph">
        <div>
          <div className="pt">Configurazione</div>
          <div className="ps">Gestisci i veicoli del parco</div>
        </div>
        <div className="pa">
          <button className="btn btnp btns" onClick={openNew}>
            <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            Aggiungi mezzo
          </button>
        </div>
      </div>

      {loading ? <div className="spinner" /> : (
        <div className="tw">
          <table>
            <thead>
              <tr><th>Foto</th><th>#</th><th>Descrizione</th><th>Targa</th><th>Posti</th><th>Tipo</th><th>Abilitato</th><th>Ferrero</th><th></th></tr>
            </thead>
            <tbody>
              {mezzi.map(m => (
                <tr key={m.id}>
                  {/* COLONNA FOTO */}
                  <td style={{width:72, padding:'6px 8px'}}>
                    <div style={{
                      width: 64, height: 46, borderRadius: 6,
                      background: 'var(--ink3)',
                      backgroundImage: m.hasImmagine ? `url(${getFotoUrl(m.id)})` : 'none',
                      backgroundSize: 'cover', backgroundPosition: 'center',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, color: 'var(--text3)',
                      flexShrink: 0
                    }}>
                      {!m.hasImmagine && '🚐'}
                    </div>
                  </td>
                  <td className="m" onClick={() => openEdit(m)}>{m.numeroAutoMezzo ?? m.id}</td>
                  <td onClick={() => openEdit(m)}><strong>{m.descrizione}</strong></td>
                  <td onClick={() => openEdit(m)}><span className="pb">{m.targa}</span></td>
                  <td className="m" onClick={() => openEdit(m)}>{m.posti}</td>
                  <td style={{color:'var(--text2)',fontSize:12}} onClick={() => openEdit(m)}>{m.tipoDescrizione}</td>
                  <td><span style={{color: m.abilitazione ? 'var(--green)' : 'var(--red)', fontSize:16}}>{m.abilitazione ? '✓' : '✗'}</span></td>
                  <td><span style={{color: m.tesseriniFerrero ? 'var(--amber)' : 'var(--text3)'}}>{m.tesseriniFerrero ? '✓' : '—'}</span></td>
                  <td>
                    <div style={{display:'flex', gap:6}}>
                      <button
                        className="btn btng btns"
                        onClick={() => handleUploadClick(m.id)}
                        disabled={uploadingId === m.id}
                        title="Carica foto"
                      >
                        {uploadingId === m.id ? '...' : (
                          <svg viewBox="0 0 24 24" style={{width:13,height:13}}>
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                            <polyline points="17 8 12 3 7 8"/>
                            <line x1="12" y1="3" x2="12" y2="15"/>
                          </svg>
                        )}
                        {m.hasImmagine ? 'Cambia foto' : 'Carica foto'}
                      </button>
                      {m.hasImmagine && (
                        <button
                          className="btn btnd btns"
                          onClick={() => handleEliminaFoto(m.id)}
                          title="Elimina foto"
                          style={{padding:'7px 8px'}}
                        >
                          <svg viewBox="0 0 24 24" style={{width:13,height:13}}>
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                          </svg>
                        </button>
                      )}
                      <button className="btn btng btns" onClick={() => openEdit(m)}>Modifica</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="mcl" onClick={() => setModal(null)}>✕</button>
            <div className="mt">{modal.type === 'edit' ? `Modifica — ${modal.mezzo?.descrizione}` : 'Nuovo mezzo'}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div className="mf" style={{gridColumn:'1/-1'}}>
                <label>Descrizione</label>
                <input className="mi" value={form.descrizione} onChange={e => setForm(f => ({...f, descrizione: e.target.value}))} />
              </div>
              <div className="mf">
                <label>Targa</label>
                <input className="mi" value={form.targa} onChange={e => setForm(f => ({...f, targa: e.target.value}))} />
              </div>
              <div className="mf">
                <label>Posti</label>
                <input className="mi" type="number" min="1" max="9" value={form.posti} onChange={e => setForm(f => ({...f, posti: e.target.value}))} />
              </div>
              <div className="mf">
                <label>Tipo</label>
                <select className="mi" value={form.tipo} onChange={e => setForm(f => ({...f, tipo: e.target.value}))}>
                  <option value="">Seleziona...</option>
                  {tipologie.map(t => <option key={t.id} value={t.id}>{t.tipo?.trim()}</option>)}
                </select>
              </div>
              <div className="mf">
                <label>Abilitato</label>
                <div style={{marginTop:4}}>
                  <div className={`toggle2 ${form.abilitazione ? 'on' : ''}`} onClick={() => setForm(f => ({...f, abilitazione: !f.abilitazione}))} />
                </div>
              </div>
              <div className="mf">
                <label>Tesserino Ferrero</label>
                <div style={{marginTop:4}}>
                  <div className={`toggle2 ${form.tesseriniFerrero ? 'on' : ''}`} onClick={() => setForm(f => ({...f, tesseriniFerrero: !f.tesseriniFerrero}))} />
                </div>
              </div>
            </div>
            <div className="mac">
              <button className="btn btng" onClick={() => setModal(null)}>Annulla</button>
              <button className="btn btnp" onClick={handleSave} disabled={saving}>{saving ? 'Salvataggio...' : 'Salva'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ConfigurazionePage
