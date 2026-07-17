import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ApiError } from '../services/api'

export default function LoginPage() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!loading && user) {
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname
    return <Navigate to={from ?? '/queries'} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(email, password)
      navigate('/queries', { replace: true })
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError('email') ?? err.message
          : 'Could not reach the server.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <form className="auth__card" onSubmit={handleSubmit}>
        <h1 className="auth__title">Manuscript Tracker</h1>
        <p className="auth__sub">Every query, every response, one ledger.</p>

        {error && <p className="form-error" role="alert">{error}</p>}

        <label className="field">
          <span className="field__label">Email</span>
          <input
            type="email" value={email} autoComplete="email" required
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field__label">Password</span>
          <input
            type="password" value={password} autoComplete="current-password" required
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <Link to="/forgot-password" className="auth__forgot">
          Forgot password?
        </Link>

        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="auth__alt">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </form>
    </div>
  )
}
