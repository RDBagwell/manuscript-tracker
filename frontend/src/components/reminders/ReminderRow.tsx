import { useState } from 'react'
import api from '../../services/api'
import { useToast } from '../Toasts'
import { formatDate } from '../../types'
import type { Reminder, Wrapped } from '../../types'

/** One reminder with its complete / snooze-a-week / delete actions. */
export default function ReminderRow({
  reminder, onChanged, onRemoved,
}: {
  reminder: Reminder
  onChanged: (r: Reminder) => void
  onRemoved: (id: number) => void
}) {
  const [busy, setBusy] = useState(false)
  const toast = useToast()

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
      toast(`Done: ${reminder.reason}`)
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
      toast(`Snoozed — now due ${formatDate(res.data.due_at)}`)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!window.confirm(`Delete reminder "${reminder.reason}"?`)) return
    await api.delete(`/reminders/${reminder.id}`)
    onRemoved(reminder.id)
    toast('Reminder deleted')
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
