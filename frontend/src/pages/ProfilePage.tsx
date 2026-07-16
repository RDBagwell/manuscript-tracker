import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import api, { ApiError } from '../services/api'
import type { User, Wrapped } from '../types'

export default function ProfilePage() {
  const { user, applyUser } = useAuth()

  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [idBusy, setIdBusy] = useState(false)
  const [idError, setIdError] = useState<ApiError | null>(null)
  const [idSaved, setIdSaved] = useState(false)

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwBusy, setPwBusy] = useState(false)
  const [pwError, setPwError] = useState<ApiError | null>(null)
  const [pwSaved, setPwSaved] = useState(false)

  async function saveIdentity(e: FormEvent) {
    e.preventDefault()
    setIdBusy(true)
    setIdError(null)
    setIdSaved(false)
    try {
      const res = await api.put<Wrapped<User>>('/auth/user', { name, email })
      applyUser(res.data)
      setIdSaved(true)
    } catch (err) {
      setIdError(err instanceof ApiError ? err : new ApiError(0, 'Could not reach the server.'))
    } finally {
      setIdBusy(false)
    }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault()
    setPwBusy(true)
    setPwError(null)
    setPwSaved(false)
    try {
      await api.put('/auth/user', {
        current_password: currentPw,
        password: newPw,
        password_confirmation: confirmPw,
      })
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
      setPwSaved(true)
    } catch (err) {
      setPwError(err instanceof ApiError ? err : new ApiError(0, 'Could not reach the server.'))
    } finally {
      setPwBusy(false)
    }
  }

  return (
    <div className="page page--narrow">
      <div className="page__head">
        <h1 className="page__title">Profile</h1>
      </div>

      <form className="panel" onSubmit={saveIdentity}>
        <h2 className="panel__head">Identity</h2>

        <label className="field">
          <span className="field__label">Name</span>
          <input required value={name} onChange={(e) => setName(e.target.value)} />
          {idError?.firstError('name') && (
            <span className="field__error">{idError.firstError('name')}</span>
          )}
        </label>

        <label className="field">
          <span className="field__label">Email</span>
          <input
            type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {idError?.firstError('email') && (
            <span className="field__error">{idError.firstError('email')}</span>
          )}
        </label>

        {idError && !idError.errors && (
          <p className="form-error" role="alert">{idError.message}</p>
        )}
        {idSaved && <p className="notice" role="status">Profile updated.</p>}

        <div className="form-actions">
          <button type="submit" className="btn btn--primary" disabled={idBusy}>
            {idBusy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>

      <form className="panel" onSubmit={savePassword}>
        <h2 className="panel__head">Change password</h2>

        <label className="field">
          <span className="field__label">Current password</span>
          <input
            type="password" required value={currentPw}
            autoComplete="current-password"
            onChange={(e) => setCurrentPw(e.target.value)}
          />
          {pwError?.firstError('current_password') && (
            <span className="field__error">{pwError.firstError('current_password')}</span>
          )}
        </label>

        <label className="field">
          <span className="field__label">New password</span>
          <input
            type="password" required value={newPw}
            autoComplete="new-password"
            onChange={(e) => setNewPw(e.target.value)}
          />
          {pwError?.firstError('password') && (
            <span className="field__error">{pwError.firstError('password')}</span>
          )}
        </label>

        <label className="field">
          <span className="field__label">Confirm new password</span>
          <input
            type="password" required value={confirmPw}
            autoComplete="new-password"
            onChange={(e) => setConfirmPw(e.target.value)}
          />
        </label>

        {pwError && !pwError.errors && (
          <p className="form-error" role="alert">{pwError.message}</p>
        )}
        {pwSaved && <p className="notice" role="status">Password updated.</p>}

        <div className="form-actions">
          <button type="submit" className="btn btn--primary" disabled={pwBusy}>
            {pwBusy ? 'Saving…' : 'Update password'}
          </button>
        </div>
      </form>
    </div>
  )
}
