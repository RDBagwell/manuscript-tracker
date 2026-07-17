import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import api from '../services/api'
import type { Reminder, Wrapped } from '../types'

export default function Layout() {
  const { user, logout } = useAuth()
  const [dueCount, setDueCount] = useState(0)

  useEffect(() => {
    api.get<Wrapped<Reminder[]>>('/reminders?filter=pending')
      .then((res) => setDueCount(res.data.filter((r) => r.is_due).length))
      .catch(() => { /* badge is a nicety, not a dependency */ })
  }, [])

  return (
    <div className="shell">
      <header className="topbar">
        <span className="wordmark">Manuscript Tracker</span>
        <nav className="topnav" aria-label="Main">
          <NavLink to="/queries">Queries</NavLink>
          <NavLink to="/manuscripts">Manuscripts</NavLink>
          <NavLink to="/agents">Agents</NavLink>
          <NavLink to="/reminders">
            Reminders
            {dueCount > 0 && <span className="navdot">{dueCount}</span>}
          </NavLink>
        </nav>
        <div className="topbar__user">
          <NavLink to="/profile" className="topbar__name">{user?.name}</NavLink>
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
