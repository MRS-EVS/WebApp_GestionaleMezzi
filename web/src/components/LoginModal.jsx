import { useAuth } from '../context/AuthContext'
import LoginForm from './LoginForm'

// Modale di login contestuale: compare solo quando un'azione lo richiede
// (prendere o prenotare un mezzo), senza far perdere la pagina corrente.
export default function LoginModal() {
  const { authPrompt, cancelAuth } = useAuth()

  if (!authPrompt) return null

  return (
    <div className="overlay" onClick={cancelAuth}>
      <div className="modal" style={{width:380}} onClick={e => e.stopPropagation()}>
        <button className="mcl" onClick={cancelAuth}>✕</button>
        <div className="mt">Accedi per continuare</div>
        {authPrompt.motivo && (
          <p className="login-reason">{authPrompt.motivo}</p>
        )}
        <LoginForm />
      </div>
    </div>
  )
}
