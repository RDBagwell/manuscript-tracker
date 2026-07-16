import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ApiError } from '../services/api'

export default function RegisterPage() {
  const { user, loading, register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!loading && user) return <Navigate to="/queries" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await register(name, email, password, confirm)
      navigate('/queries', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.firstError('email')
            ?? err.firstError('password')
            ?? err.firstError('name')
            ?? err.message,
        )
      } else {
        setError('Could not reach the server.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <form className="auth__card" onSubmit={handleSubmit}>
        <h1 className="auth__title">Create your ledger</h1>
        <p className="auth__sub">Track queries, requests, and responses in one place.</p>

        {error && <p className="form-error" role="alert">{error}</p>}

        <label className="field">
          <span className="field__label">Name</span>
          <input value={name} autoComplete="name" required
            onChange={(e) => setName(e.target.value)} />
        </label>

        <label className="field">
          <span className="field__label">Email</span>
          <input type="email" value={email} autoComplete="email" required
            onChange={(e) => setEmail(e.target.value)} />
        </label>

        <label className="field">
          <span className="field__label">Password</span>
          <input type="password" value={password} autoComplete="new-password" required
            onChange={(e) => setPassword(e.target.value)} />
        </label>

        <label className="field">
          <span className="field__label">Confirm password</span>
          <input type="password" value={confirm} autoComplete="new-password" required
            onChange={(e) => setConfirm(e.target.value)} />
        </label>

        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? 'Creating…' : 'Create account'}
        </button>

        <p className="auth__alt">
          Already tracking? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  )
}
