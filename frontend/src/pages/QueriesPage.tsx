import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import api, { ApiError } from '../services/api'
import StatusBadge from '../components/StatusBadge'
import {
  EVENT_TYPE_LABELS, QUERY_STATUS_LABELS, formatDate,
} from '../types'
import type {
  Agent, EventStoreResponse, Manuscript, Query, QueryEventType,
  QueryStatus, QueryStoreResponse, Wrapped,
} from '../types'

const EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as QueryEventType[]
const STATUSES = Object.keys(QUERY_STATUS_LABELS) as QueryStatus[]

export default function QueriesPage() {
  const [queries, setQueries] = useState<Query[]>([])
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [showNew, setShowNew] = useState(false)

  const [manuscriptFilter, setManuscriptFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [openOnly, setOpenOnly] = useState(false)

  const loadQueries = useCallback(async () => {
    const params = new URLSearchParams()
    if (manuscriptFilter) params.set('manuscript_id', manuscriptFilter)
    if (statusFilter) params.set('status', statusFilter)
    if (openOnly) params.set('open', '1')
    const qs = params.toString()
    const res = await api.get<Wrapped<Query[]>>(`/queries${qs ? `?${qs}` : ''}`)
    setQueries(res.data)
  }, [manuscriptFilter, statusFilter, openOnly])

  useEffect(() => {
    Promise.all([
      api.get<Wrapped<Manuscript[]>>('/manuscripts'),
      api.get<Wrapped<Agent[]>>('/agents'),
    ])
      .then(([m, a]) => {
        setManuscripts(m.data)
        setAgents(a.data)
      })
      .catch(() => setError('Could not load manuscripts and agents.'))
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)
    loadQueries()
      .catch(() => setError('Could not load queries.'))
      .finally(() => setLoading(false))
  }, [loadQueries])

  function replaceQuery(updated: Query) {
    setQueries((prev) => prev.map((q) => (q.id === updated.id ? updated : q)))
  }

  const openCount = useMemo(
    () => queries.filter((q) => !q.closed_at).length,
    [queries],
  )

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Queries</h1>
          <p className="page__meta">
            {queries.length} thread{queries.length === 1 ? '' : 's'} ·{' '}
            {openCount} open
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

      {warnings.length > 0 && (
        <div className="warnbox" role="alert">
          <strong className="warnbox__head">Before you lick the stamp</strong>
          <ul>
            {warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
          <button
            type="button" className="btn btn--ghost"
            onClick={() => setWarnings([])}
          >
            Dismiss
          </button>
        </div>
      )}

      {showNew && (
        <NewQueryForm
          manuscripts={manuscripts}
          agents={agents}
          onCreated={(q, warns) => {
            setQueries((prev) => [q, ...prev])
            setWarnings(warns)
            setShowNew(false)
            setExpandedId(q.id)
          }}
        />
      )}

      <div className="filters">
        <label className="field field--inline">
          <span className="field__label">Manuscript</span>
          <select
            value={manuscriptFilter}
            onChange={(e) => setManuscriptFilter(e.target.value)}
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
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
            checked={openOnly}
            onChange={(e) => setOpenOnly(e.target.checked)}
          />
          <span>Open only</span>
        </label>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      {loading && <p className="muted">Pulling the files…</p>}

      {!loading && queries.length === 0 && (
        <div className="empty">
          <p>No query threads match.</p>
          <p className="muted">Log a query to start the ledger.</p>
        </div>
      )}

      <ul className="threadlist">
        {queries.map((q) => (
          <QueryRow
            key={q.id}
            query={q}
            expanded={expandedId === q.id}
            onToggle={() =>
              setExpandedId((cur) => (cur === q.id ? null : q.id))}
            onUpdated={replaceQuery}
          />
        ))}
      </ul>
    </div>
  )
}

function QueryRow({
  query, expanded, onToggle, onUpdated,
}: {
  query: Query
  expanded: boolean
  onToggle: () => void
  onUpdated: (q: Query) => void
}) {
  const [full, setFull] = useState<Query | null>(
    query.events ? query : null,
  )
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    if (!expanded || full) return
    setLoadingDetail(true)
    api.get<Wrapped<Query>>(`/queries/${query.id}`)
      .then((res) => setFull(res.data))
      .finally(() => setLoadingDetail(false))
  }, [expanded, full, query.id])

  const detail = full ?? query

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

          <h2 className="casefile__head">Correspondence log</h2>
          {loadingDetail && <p className="muted">Opening…</p>}

          <ol className="ledger">
            {(detail.events ?? []).map((ev) => (
              <li key={ev.id} className="ledger__line">
                <span className="ledger__what">
                  {ev.type_label}
                  {ev.notes && <span className="ledger__note"> · {ev.notes}</span>}
                </span>
                <span className="ledger__dots" aria-hidden="true" />
                <span className="ledger__when">{formatDate(ev.happened_at)}</span>
              </li>
            ))}
            {(detail.events?.length ?? 0) === 0 && !loadingDetail && (
              <li className="muted">Nothing logged yet.</li>
            )}
          </ol>

          <RecordEventForm queryId={query.id} onRecorded={(q) => {
            setFull(q)
            onUpdated(q)
          }} />
        </div>
      )}
    </li>
  )
}

function RecordEventForm({
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

function NewQueryForm({
  manuscripts, agents, onCreated,
}: {
  manuscripts: Manuscript[]
  agents: Agent[]
  onCreated: (q: Query, warnings: string[]) => void
}) {
  const [manuscriptId, setManuscriptId] = useState('')
  const [agentId, setAgentId] = useState('')
  const [wave, setWave] = useState('')
  const [sentAt, setSentAt] = useState('')
  const [personalization, setPersonalization] = useState('')
  const [materials, setMaterials] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await api.post<QueryStoreResponse>('/queries', {
        manuscript_id: Number(manuscriptId),
        agent_id: Number(agentId),
        wave: wave ? Number(wave) : undefined,
        sent_at: sentAt || undefined,
        personalization: personalization || undefined,
        materials: materials || undefined,
      })
      onCreated(res.data, res.meta.warnings)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.firstError('agent_id')
            ?? err.firstError('manuscript_id')
            ?? err.message,
        )
      } else {
        setError('Could not log the query.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="panel newquery" onSubmit={handleSubmit}>
      <h2 className="panel__head">Log a query</h2>

      <div className="newquery__grid">
        <label className="field">
          <span className="field__label">Manuscript</span>
          <select
            required value={manuscriptId}
            onChange={(e) => setManuscriptId(e.target.value)}
          >
            <option value="" disabled>Choose…</option>
            {manuscripts.map((m) => (
              <option key={m.id} value={m.id}>{m.title}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Agent</span>
          <select
            required value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
          >
            <option value="" disabled>Choose…</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.agency ? ` — ${a.agency.name}` : ''}
                {a.open_to_queries ? '' : ' (closed)'}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Wave</span>
          <input
            type="number" min={1} value={wave}
            onChange={(e) => setWave(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field__label">Sent on (optional backfill)</span>
          <input
            type="date" value={sentAt}
            onChange={(e) => setSentAt(e.target.value)}
          />
        </label>
      </div>

      <label className="field">
        <span className="field__label">Personalization</span>
        <textarea
          rows={2} value={personalization}
          placeholder="Why this agent — MSWL fit, comps, referral…"
          onChange={(e) => setPersonalization(e.target.value)}
        />
      </label>

      <label className="field">
        <span className="field__label">Materials</span>
        <input
          value={materials} placeholder="Query + first 10 pages in body"
          onChange={(e) => setMaterials(e.target.value)}
        />
      </label>

      {error && <p className="form-error" role="alert">{error}</p>}

      <button type="submit" className="btn btn--primary" disabled={busy}>
        {busy ? 'Logging…' : 'Log query'}
      </button>
    </form>
  )
}
