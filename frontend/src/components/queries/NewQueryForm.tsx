import { useState } from 'react'
import type { FormEvent } from 'react'
import api, { ApiError } from '../../services/api'
import type { Agent, Manuscript, Query, QueryStoreResponse } from '../../types'

/**
 * Opens a thread. Advisories come back in `meta.warnings` alongside the
 * created thread and are passed up, not treated as errors.
 */
export default function NewQueryForm({
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
