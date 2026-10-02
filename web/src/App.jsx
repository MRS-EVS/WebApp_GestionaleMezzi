import { Routes, Route, Navigate, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useRef, useEffect } from 'react'
import logo from '../LOGO-MRS_white.png'
import { useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import PrenotazioniPage from './pages/PrenotazioniPage'
import StoricoPage from './pages/StoricoPage'
import ConfigurazionePage from './pages/ConfigurazionePage'
import ManutenzioniPage from './pages/ManutenzioniPage'
import UtentiPage from './pages/UtentiPage'
import ProfiloPage from './pages/ProfiloPage'
import LoginModal from './components/LoginModal'

// Super admin = utente il cui nome completo coincide con VITE_SUPER_ADMIN.
// Se la variabile non e' configurata, nessuno lo e' (prima l'anonimo passava il confronto).
const isSuperAdmin = (u) => {
  const nome = import.meta.env.VITE_SUPER_ADMIN
  return !!nome && u?.nomeCompleto === nome
}

function ProtectedRoute({ children, condition }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (condition && !condition(user)) return <Navigate to="/" replace />
  return children
}

function Layout() {
  const { user, logout, requireAuth } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const initials = user?.nomeCompleto?.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || 'U'

  const handleLogout = () => { logout(); navigate('/') }

  const navRef = useRef(null)
  const indicatorRef = useRef(null)
  const firstRender = useRef(true)

  useEffect(() => {
    if (!navRef.current || !indicatorRef.current) return
    const active = navRef.current.querySelector('.bnav-btn.active')
    if (!active) return
    const navRect = navRef.current.getBoundingClientRect()
    const btnRect = active.getBoundingClientRect()
    if (firstRender.current) {
      indicatorRef.current.style.transition = 'none'
      firstRender.current = false
    } else {
      indicatorRef.current.style.transition = 'transform 0.35s cubic-bezier(0.34,1.4,0.64,1), width 0.35s cubic-bezier(0.34,1.4,0.64,1)'
    }
    indicatorRef.current.style.width = `${btnRect.width}px`
    indicatorRef.current.style.transform = `translateX(${btnRect.left - navRect.left}px)`
  }, [location.pathname, user])

  return (
    <div className="app-layout">
      {/* Da tastiera servivano fino a 8 tab per superare la navigazione
          su ogni pagina: questo link compare al primo tab e la salta. */}
      <a href="#contenuto" className="skip-link">Salta al contenuto</a>
      <header className="topbar">
        <div className="brand">
          <img src={logo} alt="MRS" className="brand-logo" />
          <span className="brand-name">Mezzi Aziendali</span>
        </div>
        <nav className="nav">
          <NavLink to="/" end className={({ isActive }) => 'nav-btn' + (isActive ? ' active' : '')}>
            <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            Parco Mezzi
          </NavLink>
          <NavLink to="/prenotazioni" className={({ isActive }) => 'nav-btn' + (isActive ? ' active' : '')}>
            <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            Prenotazioni
          </NavLink>
          {user?.livello >= 201 && (
            <NavLink to="/storico" className={({ isActive }) => 'nav-btn' + (isActive ? ' active' : '')}>
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
              Storico
            </NavLink>
          )}
          {user?.livello >= 201 && (
            <NavLink to="/configurazione" className={({ isActive }) => 'nav-btn' + (isActive ? ' active' : '')}>
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3"/></svg>
              Config.
            </NavLink>
          )}
          {user?.livello === 999 && (
            <NavLink to="/utenti" className={({ isActive }) => 'nav-btn' + (isActive ? ' active' : '')}>
              <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
              Utenti
            </NavLink>
          )}
          {user?.livello >= 201 && user?.livello < 999 && (
            <NavLink to="/profilo" className={({ isActive }) => 'nav-btn' + (isActive ? ' active' : '')}>
              <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              Profilo
            </NavLink>
          )}
          {isSuperAdmin(user) && (
            <NavLink to="/manutenzioni" className={({ isActive }) => 'nav-btn' + (isActive ? ' active' : '')}>
              <svg viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
              Manut.
            </NavLink>
          )}
        </nav>
        <div className="topbar-end">
          {user ? (
            <div className="user-pill" onClick={handleLogout} title="Clicca per uscire">
              <div className="user-av">{initials}</div>
              <span className="user-name">{user.nomeCompleto}</span>
            </div>
          ) : (
            <button className="btn btnp btns" onClick={() => requireAuth()} title="Accedi">
              <svg viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><path d="M10 17l5-5-5-5M15 12H3"/></svg>
              Accedi
            </button>
          )}
        </div>
      </header>
      <main className="main" id="contenuto" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/prenotazioni" element={<PrenotazioniPage />} />
          <Route path="/storico" element={
            <ProtectedRoute condition={u => u.livello >= 201}><StoricoPage /></ProtectedRoute>
          } />
          <Route path="/configurazione" element={
            <ProtectedRoute condition={u => u.livello >= 201}><ConfigurazionePage /></ProtectedRoute>
          } />
          <Route path="/manutenzioni" element={
            <ProtectedRoute condition={isSuperAdmin}><ManutenzioniPage /></ProtectedRoute>
          } />
          <Route path="/utenti" element={
            <ProtectedRoute condition={u => u.livello === 999}><UtentiPage /></ProtectedRoute>
          } />
          <Route path="/profilo" element={
            <ProtectedRoute condition={u => u.livello >= 201}><ProfiloPage /></ProtectedRoute>
          } />
        </Routes>
      </main>
      <nav className="bottom-nav" ref={navRef}>
        <div className="bnav-indicator" ref={indicatorRef} />
        <NavLink to="/" end className={({ isActive }) => 'bnav-btn' + (isActive ? ' active' : '')}>
          <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          Parco
        </NavLink>
        <NavLink to="/prenotazioni" className={({ isActive }) => 'bnav-btn' + (isActive ? ' active' : '')}>
          <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          Prenotazioni
        </NavLink>
        {user?.livello >= 201 && (
          <NavLink to="/storico" className={({ isActive }) => 'bnav-btn' + (isActive ? ' active' : '')}>
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
            Storico
          </NavLink>
        )}
        {user?.livello >= 201 && (
          <NavLink to="/configurazione" className={({ isActive }) => 'bnav-btn' + (isActive ? ' active' : '')}>
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3"/></svg>
            Config.
          </NavLink>
        )}
        {user?.livello === 999 && (
          <NavLink to="/utenti" className={({ isActive }) => 'bnav-btn' + (isActive ? ' active' : '')}>
            <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
            Utenti
          </NavLink>
        )}
        {user?.livello >= 201 && user?.livello < 999 && (
          <NavLink to="/profilo" className={({ isActive }) => 'bnav-btn' + (isActive ? ' active' : '')}>
            <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            Profilo
          </NavLink>
        )}
        {isSuperAdmin(user) && (
          <NavLink to="/manutenzioni" className={({ isActive }) => 'bnav-btn' + (isActive ? ' active' : '')}>
            <svg viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
            Manut.
          </NavLink>
        )}
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<Layout />} />
      </Routes>
      {/* Login contestuale, disponibile da qualsiasi pagina */}
      <LoginModal />
    </>
  )
}
