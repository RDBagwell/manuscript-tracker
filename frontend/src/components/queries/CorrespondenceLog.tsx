import { formatDate } from '../../types'
import type { QueryEvent } from '../../types'

/** The thread's append-only event stream, oldest first. */
export default function CorrespondenceLog({
  events, loading,
}: {
  events: QueryEvent[] | undefined
  loading: boolean
}) {
  return (
    <>
      <h2 className="casefile__head">Correspondence log</h2>
      {loading && <p className="muted">Opening…</p>}

      <ol className="ledger">
        {(events ?? []).map((ev) => (
          <li key={ev.id} className="ledger__line">
            <span className="ledger__what">
              {ev.type_label}
              {ev.notes && <span className="ledger__note"> · {ev.notes}</span>}
            </span>
            <span className="ledger__dots" aria-hidden="true" />
            <span className="ledger__when">{formatDate(ev.happened_at)}</span>
          </li>
        ))}
        {(events?.length ?? 0) === 0 && !loading && (
          <li className="muted">Nothing logged yet.</li>
        )}
      </ol>
    </>
  )
}
