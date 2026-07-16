import type { QueryStatus } from '../types'
import { QUERY_STATUS_LABELS } from '../types'

export default function StatusBadge({ status }: { status: QueryStatus }) {
  return (
    <span className={`badge badge--${status}`}>
      {QUERY_STATUS_LABELS[status]}
    </span>
  )
}
