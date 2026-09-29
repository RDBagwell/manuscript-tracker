import { useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import NewReminderForm from '../components/reminders/NewReminderForm'
import ReminderSection from '../components/reminders/ReminderSection'
import { useFetch } from '../hooks/useFetch'
import type { Agent, Manuscript, Query, Reminder, Wrapped } from '../types'

type Filter = 'pending' | 'completed'

export default function RemindersPage() {
  const [filter, setFilter] = useState<Filter>('pending')
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

  const {
    data: reminders, setData: setReminders, loading, failed,
  } = useFetch<Reminder[]>(`/reminders?filter=${filter}`, [])
  const error = failed ? 'Could not load reminders.' : null

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
