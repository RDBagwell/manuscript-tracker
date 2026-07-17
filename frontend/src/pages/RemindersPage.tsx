import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import api, { ApiError } from '../services/api'
import { formatDate } from '../types'
import type { Agent, Manuscript, Query, Reminder, Wrapped } from '../types'

type Filter = 'pending' | 'completed'

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [filter, setFilter] = useState<Filter>('pending')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)

  const [manuscripts, setManuscripts] = useState<Manuscript[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [queries, setQueries] = useState<Query[]>([])

  useEffect(() => {
    Promise.all([
      api.get<Wrapped<Manuscript[]>>('/manuscripts'),
      api.get<Wrapped<Agent[]>>('/agents'),
      api.get<Wrapped<Query[]>>('/queries'),
    ])
      .then(([m, a, q]) => {
        setManuscripts(m.data)
        setAgents(a.data)
        setQueries(q.data)
      })
      .catch(() => { /* create form degrades; list still works */ })
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)
    api.get<Wrapped<Reminder[]>>(`/reminders?filter=${filter}`)
      .then((res) => setReminders(res.data))
      .catch(() => setError('Could not load reminders.'))
      .finally(() => setLoading(false))
  }, [filter])

  function replace(updated: Reminder) {
    setReminders((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
  }

  const due = useMemo(
    () => reminders.filter((r) => !r.completed_at && r.is_due),
    [reminders],
  )
  const upcoming = useMemo(
    () => reminders.filter((r) => !r.completed_at && !r.is_due),
    [reminders],
  )
  const completed = useMemo(
    () => reminders.filter((r) => r.completed_at),
    [reminders],
  )

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Reminders</h1>
          <p className="page__meta">
            {due.length} due · {upcoming.length} upcoming
          </p>
        </div>
        <div className="filters">
          <label className="field field--inline">
            <span className="field__label">Show</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as Filter)}
            >
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <button
            type="button" className="btn btn--primary"
            onClick={() => setShowNew((v) => !v)}
          >
            {showNew ? 'Close form' : 'Set reminder'}
          </button>
        </div>
      </div>

      {showNew && (
        <NewReminderForm
          manuscripts={manuscripts}
          agents={agents}
          queries={queries}
          onCreated={(r) => {
            setReminders((prev) => [r, ...prev])
            setShowNew(false)
          }}
        />
      )}

      {error && <p className="form-error" role="alert">{error}</p>}
      {loading && <p className="muted">Pulling the files…</p>}

      {!loading && filter === 'pending' && (
        <>
          <ReminderSection
            title="Due"
            empty="Nothing due. The desk is quiet."
            items={due}
            onChanged={replace}
            onRemoved={(id) =>
              setReminders((prev) => prev.filter((r) => r.id !== id))}
          />
          <ReminderSection
            title="Upcoming"
            empty="Nothing on the horizon — set one."
            items={upcoming}
            onChanged={replace}
            onRemoved={(id) =>
              setReminders((prev) => prev.filter((r) => r.id !== id))}
          />
        </>
      )}

      {!loading && filter === 'completed' && (
        <ReminderSection
          title="Completed"
          empty="Nothing completed yet."
          items={completed}
          onChanged={replace}
          onRemoved={(id) =>
            setReminders((prev) => prev.filter((r) => r.id !== id))}
        />
      )}
    </div>
  )
}

function ReminderSection({
  title, empty, items, onChanged, onRemoved,
}: {
  title: string
  empty: string
  items: Reminder[]
  onChanged: (r: Reminder) => void
  onRemoved: (id: number) => void
}) {
  return (
    <section className="remsection">
      <h2 className="casefile__head">{title}</h2>
      {items.length === 0 && <p className="muted">{empty}</p>}
      <ul className="remlist">
        {items.map((r) => (
          <ReminderRow
            key={r.id}
            reminder={r}
            onChanged={onChanged}
            onRemoved={onRemoved}
          />
        ))}
      </ul>
    </section>
  )
}

function ReminderRow({
  reminder, onChanged, onRemoved,
}: {
  reminder: Reminder
  onChanged: (r: Reminder) => void
  onRemoved: (id: number) => void
}) {
  const [busy, setBusy] = useState(false)

  const dueLabel = reminder.completed_at
    ? `done ${formatDate(reminder.completed_at)}`
    : reminder.due_in_days < 0
      ? `${Math.abs(reminder.due_in_days)}d overdue`
      : reminder.due_in_days === 0
        ? 'due today'
        : `in ${reminder.due_in_days}d`

  async function complete() {
    setBusy(true)
    try {
      const res = await api.post<Wrapped<Reminder>>(
        `/reminders/${reminder.id}/complete`, {},
      )
      onChanged(res.data)
    } finally {
      setBusy(false)
    }
  }

  async function snooze() {
    setBusy(true)
    try {
      const base = Math.max(Date.now(), new Date(reminder.due_at).getTime())
      const res = await api.put<Wrapped<Reminder>>(`/reminders/${reminder.id}`, {
        due_at: new Date(base + 7 * 86400_000).toISOString(),
      })
      onChanged(res.data)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!window.confirm(`Delete reminder "${reminder.reason}"?`)) return
    await api.delete(`/reminders/${reminder.id}`)
    onRemoved(reminder.id)
  }

  return (
    <li className={`remrow ${reminder.is_due && !reminder.completed_at ? 'remrow--due' : ''}`}>
      <div className="remrow__what">
        <span className="remrow__reason">{reminder.reason}</span>
        <span className="thread__agency">{reminder.target}</span>
      </div>
      <span className="thread__mono">{formatDate(reminder.due_at)}</span>
      <span className={`rem-when ${reminder.due_in_days < 0 && !reminder.completed_at ? 'rem-when--over' : ''}`}>
        {dueLabel}
      </span>
      {!reminder.completed_at && (
        <div className="remrow__actions">
          <button type="button" className="btn" disabled={busy} onClick={complete}>
            Complete
          </button>
          <button type="button" className="btn btn--ghost" disabled={busy} onClick={snooze}>
            Snooze 1w
          </button>
          <button type="button" className="btn btn--ghost btn--danger" onClick={remove}>
            Delete
          </button>
        </div>
      )}
    </li>
  )
}

function NewReminderForm({
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
