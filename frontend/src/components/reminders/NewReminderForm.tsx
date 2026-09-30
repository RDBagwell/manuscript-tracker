import { useState } from 'react'
import type { FormEvent } from 'react'
import api, { ApiError } from '../../services/api'
import type { Agent, Manuscript, Query, Reminder, Wrapped } from '../../types'

export default function NewReminderForm({
  manuscripts, agents, queries, onCreated,
}: {
  manuscripts: Manuscript[]
  agents: Agent[]
  queries: Query[]
  onCreated: (r: Reminder) => void
}) {
  const [type, setType] = useState<'query' | 'manuscript' | 'agent'>('query')
  const [targetId, setTargetId] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const options = type === 'query'
    ? queries.map((q) => ({
        id: q.id,
        label: `${q.manuscript?.title ?? '—'} → ${q.agent?.name ?? '—'}`,
      }))
    : type === 'manuscript'
      ? manuscripts.map((m) => ({ id: m.id, label: m.title }))
      : agents.map((a) => ({ id: a.id, label: a.name }))

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await api.post<Wrapped<Reminder>>('/reminders', {
        remindable_type: type,
        remindable_id: Number(targetId),
        due_at: dueAt,
        reason,
        notes: notes || undefined,
      })
      onCreated(res.data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not set the reminder.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="panel" onSubmit={handleSubmit}>
      <h2 className="panel__head">Set a reminder</h2>

      <div className="formgrid">
        <label className="field">
          <span className="field__label">About a</span>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value as typeof type)
              setTargetId('')
            }}
          >
            <option value="query">Query thread</option>
            <option value="manuscript">Manuscript</option>
            <option value="agent">Agent</option>
          </select>
        </label>

        <label className="field">
          <span className="field__label">Which</span>
          <select
            required value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
          >
            <option value="" disabled>Choose…</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Due</span>
          <input
            type="date" required value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />
        </label>
      </div>

      <label className="field">
        <span className="field__label">Reason</span>
        <input
          required value={reason} maxLength={255}
          placeholder="Nudge on the partial…"
          onChange={(e) => setReason(e.target.value)}
        />
      </label>

      <label className="field">
        <span className="field__label">Notes</span>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>

      {error && <p className="form-error" role="alert">{error}</p>}

      <button type="submit" className="btn btn--primary" disabled={busy}>
        {busy ? 'Setting…' : 'Set reminder'}
      </button>
    </form>
  )
}
