import { QUERY_STATUS_LABELS } from '../../types'
import type { Manuscript, QueryStatus } from '../../types'
import type { QueryFilterState } from './useQueryFilters'

const STATUSES = Object.keys(QUERY_STATUS_LABELS) as QueryStatus[]

export default function QueryFilters({
  filters, manuscripts,
}: {
  filters: QueryFilterState
  manuscripts: Manuscript[]
}) {
  return (
    <div className="filters">
      <label className="field field--inline">
        <span className="field__label">Manuscript</span>
        <select
          value={filters.manuscriptId}
          onChange={(e) => filters.setManuscriptId(e.target.value)}
        >
          <option value="">All</option>
          {manuscripts.map((m) => (
            <option key={m.id} value={m.id}>{m.title}</option>
          ))}
        </select>
      </label>

      <label className="field field--inline">
        <span className="field__label">Status</span>
        <select
          value={filters.status}
          onChange={(e) => filters.setStatus(e.target.value)}
        >
          <option value="">All</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{QUERY_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </label>

      <label className="check">
        <input
          type="checkbox"
          checked={filters.openOnly}
          onChange={(e) => filters.setOpenOnly(e.target.checked)}
        />
        <span>Open only</span>
      </label>

      <label className="field field--inline">
        <span className="field__label">Sort</span>
        <select value={filters.sort} onChange={(e) => filters.setSort(e.target.value)}>
          <option value="sent_at:desc">Newest sent</option>
          <option value="sent_at:asc">Longest out</option>
          <option value="wave:asc">By wave</option>
          <option value="status:asc">By status</option>
          <option value="created_at:desc">Recently logged</option>
        </select>
      </label>
    </div>
  )
}
