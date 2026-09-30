import type { Query } from '../../types'
import QueryRow from './QueryRow'

export default function ThreadList({
  queries, expandedId, onToggle, onUpdated, onDeleted,
}: {
  queries: Query[]
  expandedId: number | null
  onToggle: (id: number) => void
  onUpdated: (q: Query) => void
  onDeleted: (id: number) => void
}) {
  return (
    <ul className="threadlist">
      {queries.map((q) => (
        <QueryRow
          key={q.id}
          query={q}
          expanded={expandedId === q.id}
          onToggle={() => onToggle(q.id)}
          onUpdated={onUpdated}
          onDeleted={onDeleted}
        />
      ))}
    </ul>
  )
}
