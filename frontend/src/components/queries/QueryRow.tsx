import api from '../../services/api'
import StatusBadge from '../StatusBadge'
import { formatDate } from '../../types'
import type { Query } from '../../types'
import CorrespondenceLog from './CorrespondenceLog'
import RecordEventForm from './RecordEventForm'
import ReminderMiniForm from './ReminderMiniForm'
import { useThreadDetail } from './useThreadDetail'

/** One thread: a summary row that expands into its case file. */
export default function QueryRow({
  query, expanded, onToggle, onUpdated, onDeleted,
}: {
  query: Query
  expanded: boolean
  onToggle: () => void
  onUpdated: (q: Query) => void
  onDeleted: (id: number) => void
}) {
  const { detail: full, setDetail, loading: loadingDetail } = useThreadDetail(query, expanded)
  const detail = full ?? query

  async function handleDelete() {
    const count = detail.events?.length ?? 0
    const ok = window.confirm(
      `Delete this query thread${count ? ` and its ${count} logged event${count === 1 ? '' : 's'}` : ''}? This can't be undone.`,
    )
    if (!ok) return
    await api.delete(`/queries/${query.id}`)
    onDeleted(query.id)
  }

  return (
    <li className={`thread ${expanded ? 'thread--open' : ''}`}>
      <button
        type="button"
        className="thread__row"
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <span className="thread__agent">
          <span className="thread__agent-name">{query.agent?.name ?? '—'}</span>
          <span className="thread__agency">{query.agent?.agency?.name ?? 'No agency on file'}</span>
        </span>
        <span className="thread__ms">{query.manuscript?.title ?? '—'}</span>
        <StatusBadge status={query.status} />
        <span className="thread__mono">{query.wave ? `Wave ${query.wave}` : '—'}</span>
        <span className="thread__mono">{formatDate(query.sent_at)}</span>
        <span className="thread__mono thread__days">
          {query.days_out !== null ? `Day ${query.days_out}` : '—'}
        </span>
      </button>

      {expanded && (
        <div className="casefile">
          {(detail.personalization || detail.materials) && (
            <div className="casefile__notes">
              {detail.personalization && (
                <p><span className="muted">Personalization — </span>{detail.personalization}</p>
              )}
              {detail.materials && (
                <p><span className="muted">Materials — </span>{detail.materials}</p>
              )}
            </div>
          )}

          <CorrespondenceLog events={detail.events} loading={loadingDetail} />

          <RecordEventForm queryId={query.id} onRecorded={(q) => {
            setDetail(q)
            onUpdated(q)
          }} />

          <div className="casefile__foot">
            <ReminderMiniForm queryId={query.id} />
            <button
              type="button"
              className="btn btn--ghost btn--danger"
              onClick={handleDelete}
            >
              Delete thread
            </button>
          </div>
        </div>
      )}
    </li>
  )
}
