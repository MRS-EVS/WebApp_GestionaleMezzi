import { useRef, useState, useEffect } from 'react'

// Campo data in formato italiano gg/mm/aaaa.
//
// <input type="date"> nativo mostra SEMPRE il formato della lingua del
// browser, non quello della pagina: con Chrome in inglese diventa mm/gg/aaaa
// e l'attributo lang="it" dell'HTML viene ignorato. Qui il campo visibile e'
// quindi di testo, mentre il selettore nativo resta raggiungibile dall'icona
// del calendario.
//
// Il valore scambiato con il resto dell'app resta ISO (YYYY-MM-DD), lo stesso
// che usava l'input nativo: i componenti che lo usano non cambiano.

const isoToIt = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return y && m && d ? `${d}/${m}/${y}` : ''
}

const itToIso = (testo) => {
  const parti = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(testo.trim())
  if (!parti) return null
  const [, giorno, mese, anno] = parti
  const iso = `${anno}-${mese}-${giorno}`
  const d = new Date(`${iso}T00:00:00`)
  // Scarta date inesistenti come 31/02/2026, che Date() farebbe slittare
  if (Number.isNaN(d.getTime()) || d.getDate() !== +giorno || d.getMonth() + 1 !== +mese) return null
  return iso
}

// Inserisce le barre mentre si digita: 2109 → 21/09
const formattaDigitazione = (grezzo) => {
  const n = grezzo.replace(/\D/g, '').slice(0, 8)
  if (n.length <= 2) return n
  if (n.length <= 4) return `${n.slice(0, 2)}/${n.slice(2)}`
  return `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}`
}

export default function DateField({ value, onChange, min, max, className = 'mi', ...rest }) {
  const [testo, setTesto] = useState(() => isoToIt(value))
  const nativoRef = useRef(null)

  // Riallinea il testo quando il valore viene cambiato dall'esterno
  // (per esempio quando la data di fine segue quella di inizio)
  useEffect(() => { setTesto(isoToIt(value)) }, [value])

  const handleTesto = (e) => {
    const t = formattaDigitazione(e.target.value)
    setTesto(t)
    if (t === '') { onChange(''); return }
    const iso = itToIso(t)
    if (iso) onChange(iso)
  }

  // Testo incompleto o data inesistente: si torna all'ultimo valore valido
  const handleBlur = () => {
    if (itToIso(testo) === null) setTesto(isoToIt(value))
  }

  const apriCalendario = () => {
    const el = nativoRef.current
    if (!el) return
    // showPicker non c'e' sui browser piu' vecchi e puo' comunque fallire:
    // in quel caso resta la digitazione diretta, che e' sempre disponibile.
    try { el.showPicker?.() } catch { /* nessun calendario nativo */ }
  }

  return (
    <div className="datefield">
      <input
        type="text"
        className={className}
        inputMode="numeric"
        placeholder="gg/mm/aaaa"
        maxLength={10}
        value={testo}
        onChange={handleTesto}
        onBlur={handleBlur}
        {...rest}
      />
      <button
        type="button"
        className="datefield-cal"
        onClick={apriCalendario}
        aria-label="Apri calendario"
        title="Apri calendario"
      >
        <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
      </button>
      {/* Input nativo invisibile: serve solo ad ancorare e aprire il calendario */}
      <input
        ref={nativoRef}
        type="date"
        className="datefield-nativo"
        tabIndex={-1}
        aria-hidden="true"
        value={value || ''}
        min={min}
        max={max}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}
