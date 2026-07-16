import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="shell">
      <header className="topbar">
        <span className="wordmark">Manuscript Tracker</span>
        <nav className="topnav" aria-label="Main">
          <NavLink to="/queries">Queries</NavLink>
          <NavLink to="/manuscripts">Manuscripts</NavLink>
          <NavLink to="/agents">Agents</NavLink>
        </nav>
        <div className="topbar__user">
          <span className="topbar__name">{user?.name}</span>
          <button type="button" className="btn btn--ghost" onClick={() => logout()}>
            Sign out
          </button>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
