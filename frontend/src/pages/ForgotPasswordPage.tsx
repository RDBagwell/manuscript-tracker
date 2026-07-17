import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import api, { ApiError } from '../services/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
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
        <h1 className="auth__title">Reset your password</h1>

        {sent ? (
          <>
            <p className="auth__sub">
              If that account exists, a reset link is on its way to{' '}
              <strong>{email}</strong>. The link stays good for an hour.
            </p>
            <p className="auth__alt">
              <Link to="/login">Back to sign in</Link>
            </p>
          </>
        ) : (
          <>
            <p className="auth__sub">
              Enter your email and we'll send a link to choose a new one.
            </p>

            {error && <p className="form-error" role="alert">{error}</p>}

            <label className="field">
              <span className="field__label">Email</span>
              <input
                type="email" value={email} autoComplete="email" required
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <button type="submit" className="btn btn--primary" disabled={busy}>
              {busy ? 'Sending…' : 'Send reset link'}
            </button>

            <p className="auth__alt">
              Remembered it? <Link to="/login">Sign in</Link>
            </p>
          </>
        )}
      </form>
    </div>
  )
}
