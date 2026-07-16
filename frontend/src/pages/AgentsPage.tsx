import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import api from '../services/api'
import AgentForm from '../components/AgentForm'
import type { Agency, Agent, Wrapped } from '../types'

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [genre, setGenre] = useState('')
  const [applied, setApplied] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Agent | null>(null)

  useEffect(() => {
    api.get<Wrapped<Agency[]>>('/agencies')
      .then((res) => setAgencies(res.data))
      .catch(() => { /* agent list still works without the picker */ })
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)
    const qs = applied ? `?genre=${encodeURIComponent(applied)}` : ''
    api.get<Wrapped<Agent[]>>(`/agents${qs}`)
      .then((res) => setAgents(res.data))
      .catch(() => setError('Could not load agents.'))
      .finally(() => setLoading(false))
  }, [applied])

  function handleFilter(e: FormEvent) {
    e.preventDefault()
    setApplied(genre.trim())
  }

  return (
    <div className="page">
      <div className="page__head">
        <h1 className="page__title">Agents</h1>
        <button
          type="button" className="btn btn--primary"
          onClick={() => { setEditing(null); setShowForm((v) => !v) }}
        >
          {showForm && !editing ? 'Close form' : 'Add agent'}
        </button>
        <form className="filters" onSubmit={handleFilter}>
          <label className="field field--inline">
            <span className="field__label">Genre</span>
            <input
              value={genre} placeholder="noir, literary fiction…"
              onChange={(e) => setGenre(e.target.value)}
            />
          </label>
          <button type="submit" className="btn">Filter</button>
          {applied && (
            <button
              type="button" className="btn btn--ghost"
              onClick={() => { setGenre(''); setApplied('') }}
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {showForm && (
        <AgentForm
          key={editing?.id ?? 'new'}
          initial={editing ?? undefined}
          agencies={agencies}
          onSaved={(agent, newAgency) => {
            if (newAgency) setAgencies((prev) => [...prev, newAgency])
            setAgents((prev) =>
              editing
                ? prev.map((x) => (x.id === agent.id ? agent : x))
                : [agent, ...prev])
            setShowForm(false)
            setEditing(null)
          }}
          onCancel={() => { setShowForm(false); setEditing(null) }}
        />
      )}

      {error && <p className="form-error" role="alert">{error}</p>}
      {loading && <p className="muted">Pulling the files…</p>}

      {!loading && agents.length === 0 && (
        <div className="empty">
          <p>No agents match{applied ? ` “${applied}”` : ''}.</p>
        </div>
      )}

      <ul className="agentlist">
        {agents.map((a) => (
          <li key={a.id} className="agentrow">
            <div className="agentrow__who">
              <span className="agentrow__name">{a.name}</span>
              <span className="thread__agency">
                {a.agency?.name ?? 'No agency on file'}
                {a.agency?.one_no_means_all_no && (
                  <span className="agentrow__policy" title="One no means all no">
                    {' '}· one-no shop
                  </span>
                )}
              </span>
            </div>
            <div className="agentrow__genres">
              {(a.genres ?? []).map((g) => (
                <span key={g} className="chip">{g}</span>
              ))}
            </div>
            <span className="thread__mono">
              {a.response_window_days ? `~${a.response_window_days}d` : '—'}
            </span>
            <span className={`badge ${a.open_to_queries ? 'badge--offer' : 'badge--no_response'}`}>
              {a.open_to_queries ? 'Open' : 'Closed'}
            </span>
            <button
              type="button" className="btn btn--ghost"
              onClick={() => { setEditing(a); setShowForm(true); window.scrollTo({ top: 0 }) }}
            >
              Edit
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
