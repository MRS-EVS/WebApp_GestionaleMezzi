import { useNavigate } from 'react-router-dom'
import LoginForm from '../components/LoginForm'
import logo from '../../LOGO-MRS_white.png'

export default function LoginPage() {
  const navigate = useNavigate()

  return (
    <div className="login-page">
      <div className="login-card">
        <img src={logo} alt="MRS" className="login-logo" />
        <div className="login-title">Accedi</div>
        <div className="login-sub">Seleziona il tuo nome e inserisci il codice</div>

        <LoginForm onSuccess={() => navigate('/')} />

        <button
          className="btn btng"
          style={{width:'100%', justifyContent:'center', marginTop: 10}}
          type="button"
          onClick={() => navigate('/')}
        >
          Continua senza accedere
        </button>
      </div>
    </div>
  )
}
