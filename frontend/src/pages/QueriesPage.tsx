import { useState } from 'react'
import AdvisoryBox from '../components/queries/AdvisoryBox'
import NewQueryForm from '../components/queries/NewQueryForm'
import QueryFilters from '../components/queries/QueryFilters'
import ThreadList from '../components/queries/ThreadList'
import { useQueryFilters } from '../components/queries/useQueryFilters'
import { useQueryLedger } from '../components/queries/useQueryLedger'

export default function QueriesPage() {
  const filters = useQueryFilters()
  const ledger = useQueryLedger(filters.path)
  const { queries, loading, error } = ledger

  const [warnings, setWarnings] = useState<string[]>([])
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [showNew, setShowNew] = useState(false)

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Queries</h1>
          <p className="page__meta">
            {queries.length} thread{queries.length === 1 ? '' : 's'} ·{' '}
            {ledger.openCount} open
          </p>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => setShowNew((v) => !v)}
        >
          {showNew ? 'Close form' : 'Log query'}
        </button>
      </div>

      <AdvisoryBox warnings={warnings} onDismiss={() => setWarnings([])} />

      {showNew && (
        <NewQueryForm
          manuscripts={ledger.manuscripts}
          agents={ledger.agents}
          onCreated={(q, warns) => {
            ledger.addQuery(q)
            setWarnings(warns)
            setShowNew(false)
            setExpandedId(q.id)
          }}
        />
      )}

      <QueryFilters filters={filters} manuscripts={ledger.manuscripts} />

      {error && <p className="form-error" role="alert">{error}</p>}
      {loading && <p className="muted">Pulling the files…</p>}

      {!loading && queries.length === 0 && (
        <div className="empty">
          <p>No query threads match.</p>
          <p className="muted">Log a query to start the ledger.</p>
        </div>
      )}

      <ThreadList
        queries={queries}
        expandedId={expandedId}
        onToggle={(id) => setExpandedId((cur) => (cur === id ? null : id))}
        onUpdated={ledger.replaceQuery}
        onDeleted={ledger.removeQuery}
      />
    </div>
  )
}
