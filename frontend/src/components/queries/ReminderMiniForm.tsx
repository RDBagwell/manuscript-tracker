import { useState } from 'react'
import type { FormEvent } from 'react'
import api from '../../services/api'
import { formatDate } from '../../types'
import type { Reminder, Wrapped } from '../../types'

/** Inline "set reminder" for a thread; collapses to a confirmation. */
export default function ReminderMiniForm({ queryId }: { queryId: number }) {
  const [open, setOpen] = useState(false)
  const [dueAt, setDueAt] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [savedFor, setSavedFor] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await api.post<Wrapped<Reminder>>('/reminders', {
        remindable_type: 'query',
        remindable_id: queryId,
        due_at: dueAt,
        reason,
      })
      setSavedFor(res.data.due_at)
      setOpen(false)
      setDueAt('')
      setReason('')
    } catch {
      setError('Could not set the reminder.')
    } finally {
      setBusy(false)
    }
  }

  if (savedFor) {
    return (
      <p className="notice">
        Reminder set for {formatDate(savedFor)}.
      </p>
    )
  }

  if (!open) {
    return (
      <button type="button" className="btn btn--ghost" onClick={() => setOpen(true)}>
        Set reminder
      </button>
    )
  }

  return (
    <form className="eventform eventform--bare" onSubmit={handleSubmit}>
      <label className="field field--inline">
        <span className="field__label">Due</span>
        <input
          type="date" required value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
        />
      </label>
      <label className="field field--inline field--grow">
        <span className="field__label">Reason</span>
        <input
          required value={reason} maxLength={255}
          placeholder="Nudge on the partial…"
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <button type="submit" className="btn" disabled={busy}>
        {busy ? 'Setting…' : 'Set'}
      </button>
      <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)}>
        Cancel
      </button>
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  )
}
