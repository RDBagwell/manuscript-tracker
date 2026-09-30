import type { Reminder } from '../../types'
import ReminderRow from './ReminderRow'

export default function ReminderSection({
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
