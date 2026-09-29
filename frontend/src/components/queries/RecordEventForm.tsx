import { useState } from 'react'
import type { FormEvent } from 'react'
import api, { ApiError } from '../../services/api'
import { EVENT_TYPE_LABELS } from '../../types'
import type { EventStoreResponse, Query, QueryEventType } from '../../types'

const EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as QueryEventType[]

/**
 * Appends an event through POST /queries/:id/events — the API's single
 * write path — and hands back the thread with its re-projected status.
 */
export default function RecordEventForm({
  queryId, onRecorded,
}: {
  queryId: number
  onRecorded: (q: Query) => void
}) {
  const [type, setType] = useState<QueryEventType>('sent')
  const [happenedAt, setHappenedAt] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await api.post<EventStoreResponse>(
        `/queries/${queryId}/events`,
        {
          type,
          happened_at: happenedAt || undefined,
          notes: notes || undefined,
        },
      )
      onRecorded(res.query.data)
      setNotes('')
      setHappenedAt('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not record the event.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="eventform" onSubmit={handleSubmit}>
      <label className="field field--inline">
        <span className="field__label">Event</span>
        <select value={type} onChange={(e) => setType(e.target.value as QueryEventType)}>
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </label>

      <label className="field field--inline">
        <span className="field__label">Date</span>
        <input
          type="date" value={happenedAt}
          onChange={(e) => setHappenedAt(e.target.value)}
        />
      </label>

      <label className="field field--inline field--grow">
        <span className="field__label">Notes</span>
        <input
          value={notes} placeholder="First 50 pages as attachment…"
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      <button type="submit" className="btn" disabled={busy}>
        {busy ? 'Recording…' : 'Record event'}
      </button>

      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  )
}
