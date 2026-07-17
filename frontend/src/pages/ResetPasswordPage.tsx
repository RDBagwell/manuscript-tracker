import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api, { ApiError } from '../services/api'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''

  const [email, setEmail] = useState(params.get('email') ?? '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.post('/auth/reset-password', {
        token,
        email,
        password,
        password_confirmation: confirm,
      })
      setDone(true)
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, 'Could not reach the server.'))
    } finally {
      setBusy(false)
    }
  }

  if (!token) {
    return (
      <div className="auth">
        <div className="auth__card">
          <h1 className="auth__title">Reset link incomplete</h1>
          <p className="auth__sub">
            This page needs the link from your reset email. If it's expired
            or mangled, request a fresh one.
          </p>
          <p className="auth__alt">
            <Link to="/forgot-password">Request a new link</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth">
      <form className="auth__card" onSubmit={handleSubmit}>
        <h1 className="auth__title">Choose a new password</h1>

        {done ? (
          <>
            <p className="auth__sub">Password reset. You're back in business.</p>
            <p className="auth__alt">
              <Link to="/login">Sign in</Link>
            </p>
          </>
        ) : (
          <>
            {error?.firstError('email') && (
              <p className="form-error" role="alert">{error.firstError('email')}</p>
            )}
            {error && !error.errors && (
              <p className="form-error" role="alert">{error.message}</p>
            )}

            <label className="field">
              <span className="field__label">Email</span>
              <input
                type="email" value={email} autoComplete="email" required
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label className="field">
              <span className="field__label">New password</span>
              <input
                type="password" value={password} autoComplete="new-password" required
                onChange={(e) => setPassword(e.target.value)}
              />
              {error?.firstError('password') && (
                <span className="field__error">{error.firstError('password')}</span>
              )}
            </label>

            <label className="field">
              <span className="field__label">Confirm new password</span>
              <input
                type="password" value={confirm} autoComplete="new-password" required
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>

            <button type="submit" className="btn btn--primary" disabled={busy}>
              {busy ? 'Resetting…' : 'Reset password'}
            </button>
          </>
        )}
      </form>
    </div>
  )
}
