import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { cambiaPasswordMia } from '../api/client'
import { useToast } from '../hooks/useToast'

export default function ProfiloPage() {
  const { user } = useAuth()
  const { showToast, ToastEl } = useToast()

  const [form, setForm] = useState({ corrente: '', nuova: '', conferma: '' })
  const [saving, setSaving] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.nuova.trim()) { showToast('Inserisci la nuova password', 'error'); return }
    if (form.nuova.trim().length < 4) { showToast('La password deve essere di almeno 4 caratteri', 'error'); return }
    if (form.nuova !== form.conferma) { showToast('Le password non coincidono', 'error'); return }
    setSaving(true)
    try {
      await cambiaPasswordMia(form.corrente, form.nuova)
      showToast('Password aggiornata', 'success')
      setForm({ corrente: '', nuova: '', conferma: '' })
    } catch (err) {
      showToast(err.response?.data?.message || 'Errore nel salvataggio', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {ToastEl}
      <div className="ph">
        <div>
          <div className="pt">Il mio profilo</div>
          <div className="ps">{user?.nomeCompleto}</div>
        </div>
      </div>

      <div style={{ maxWidth: 420, margin: '0 auto', padding: '0 16px' }}>
        <form onSubmit={handleSave}>
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div className="mf">
              <label>Password corrente</label>
              <input
                className="mi"
                type="password"
                placeholder="Inserisci la password corrente"
                value={form.corrente}
                onChange={e => setForm(f => ({ ...f, corrente: e.target.value }))}
                autoComplete="current-password"
              />
            </div>

            <div className="mf">
              <label>Nuova password</label>
              <input
                className="mi"
                type="password"
                placeholder="Minimo 4 caratteri"
                value={form.nuova}
                onChange={e => setForm(f => ({ ...f, nuova: e.target.value }))}
                autoComplete="new-password"
              />
            </div>

            <div className="mf">
              <label>Conferma nuova password</label>
              <input
                className="mi"
                type="password"
                placeholder="Ripeti la nuova password"
                value={form.conferma}
                onChange={e => setForm(f => ({ ...f, conferma: e.target.value }))}
                autoComplete="new-password"
              />
            </div>

            <button
              className="btn btnp"
              type="submit"
              style={{ justifyContent: 'center' }}
              disabled={saving || !form.nuova || !form.conferma}
            >
              {saving ? 'Salvataggio...' : 'Aggiorna password'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
