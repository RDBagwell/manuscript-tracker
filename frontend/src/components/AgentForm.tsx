import { useState } from 'react'
import type { FormEvent } from 'react'
import api, { ApiError } from '../services/api'
import type { Agency, Agent, Wrapped } from '../types'

const SUBMISSION_METHODS = [
  { value: '', label: '—' },
  { value: 'query_manager', label: 'QueryManager' },
  { value: 'email', label: 'Email' },
  { value: 'form', label: 'Website form' },
  { value: 'other', label: 'Other' },
]

const NEW_AGENCY = '__new__'

export default function AgentForm({
  initial, agencies, onSaved, onCancel,
}: {
  initial?: Agent
  agencies: Agency[]
  onSaved: (agent: Agent, newAgency: Agency | null) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [agencyId, setAgencyId] = useState(
    initial?.agency_id?.toString() ?? '',
  )
  const [title, setTitle] = useState(initial?.title ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [openToQueries, setOpenToQueries] = useState(
    initial?.open_to_queries ?? true,
  )
  const [genres, setGenres] = useState((initial?.genres ?? []).join(', '))
  const [mswl, setMswl] = useState(initial?.mswl ?? '')
  const [submissionMethod, setSubmissionMethod] = useState(
    initial?.submission_method ?? '',
  )
  const [responseWindow, setResponseWindow] = useState(
    initial?.response_window_days?.toString() ?? '',
  )
  const [notes, setNotes] = useState(initial?.notes ?? '')

  // Inline new-agency fields
  const [agencyName, setAgencyName] = useState('')
  const [agencyWebsite, setAgencyWebsite] = useState('')
  const [agencyOneNo, setAgencyOneNo] = useState(false)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const creatingAgency = agencyId === NEW_AGENCY

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)

    try {
      // Phase 1: the agency, if we're minting one. If phase 2 then fails,
      // the agency stays — it's real data either way.
      let resolvedAgencyId: number | null = null
      let createdAgency: Agency | null = null

      if (creatingAgency) {
        const res = await api.post<Wrapped<Agency>>('/agencies', {
          name: agencyName,
          website: agencyWebsite || null,
          one_no_means_all_no: agencyOneNo,
        })
        createdAgency = res.data
        resolvedAgencyId = res.data.id
      } else {
        resolvedAgencyId = agencyId ? Number(agencyId) : null
      }

      const payload = {
        name,
        agency_id: resolvedAgencyId,
        title: title || null,
        email: email || null,
        open_to_queries: openToQueries,
        genres: genres
          ? genres.split(',').map((g) => g.trim()).filter(Boolean)
          : null,
        mswl: mswl || null,
        submission_method: submissionMethod || null,
        response_window_days: responseWindow ? Number(responseWindow) : null,
        notes: notes || null,
      }

      const res = initial
        ? await api.put<Wrapped<Agent>>(`/agents/${initial.id}`, payload)
        : await api.post<Wrapped<Agent>>('/agents', payload)

      onSaved(res.data, createdAgency)
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, 'Could not reach the server.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="panel" onSubmit={handleSubmit}>
      <h2 className="panel__head">
        {initial ? `Edit — ${initial.name}` : 'Add an agent'}
      </h2>

      <div className="formgrid">
        <label className="field">
          <span className="field__label">Name</span>
          <input required value={name} onChange={(e) => setName(e.target.value)} />
          {error?.firstError('name') && (
            <span className="field__error">{error.firstError('name')}</span>
          )}
        </label>

        <label className="field">
          <span className="field__label">Agency</span>
          <select value={agencyId} onChange={(e) => setAgencyId(e.target.value)}>
            <option value="">No agency on file</option>
            {agencies.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
            <option value={NEW_AGENCY}>+ New agency…</option>
          </select>
          {error?.firstError('agency_id') && (
            <span className="field__error">{error.firstError('agency_id')}</span>
          )}
        </label>

        <label className="field">
          <span className="field__label">Title</span>
          <input
            value={title} placeholder="Senior agent…"
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field__label">Email</span>
          <input
            type="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error?.firstError('email') && (
            <span className="field__error">{error.firstError('email')}</span>
          )}
        </label>
      </div>

      {creatingAgency && (
        <div className="subpanel">
          <span className="field__label">New agency</span>
          <div className="formgrid">
            <label className="field">
              <span className="field__label">Agency name</span>
              <input
                required value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
              />
              {error?.firstError('name') && creatingAgency && (
                <span className="field__error">{error.firstError('name')}</span>
              )}
            </label>
            <label className="field">
              <span className="field__label">Website</span>
              <input
                value={agencyWebsite} placeholder="https://…"
                onChange={(e) => setAgencyWebsite(e.target.value)}
              />
            </label>
          </div>
          <label className="check">
            <input
              type="checkbox" checked={agencyOneNo}
              onChange={(e) => setAgencyOneNo(e.target.checked)}
            />
            <span>One no means all no</span>
          </label>
        </div>
      )}

      <div className="formgrid">
        <label className="field">
          <span className="field__label">Genres (comma-separated)</span>
          <input
            value={genres} placeholder="literary fiction, noir, thriller"
            onChange={(e) => setGenres(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field__label">Submission method</span>
          <select
            value={submissionMethod}
            onChange={(e) => setSubmissionMethod(e.target.value)}
          >
            {SUBMISSION_METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Response window (days)</span>
          <input
            type="number" min={1} max={730} value={responseWindow}
            onChange={(e) => setResponseWindow(e.target.value)}
          />
        </label>
      </div>

      <label className="field">
        <span className="field__label">MSWL notes</span>
        <textarea
          rows={2} value={mswl}
          placeholder="What they're actively looking for…"
          onChange={(e) => setMswl(e.target.value)}
        />
      </label>

      <label className="field">
        <span className="field__label">Notes</span>
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>

      <label className="check">
        <input
          type="checkbox" checked={openToQueries}
          onChange={(e) => setOpenToQueries(e.target.checked)}
        />
        <span>Open to queries</span>
      </label>

      {error && !error.errors && (
        <p className="form-error" role="alert">{error.message}</p>
      )}

      <div className="form-actions">
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? 'Saving…' : initial ? 'Save changes' : 'Add agent'}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
