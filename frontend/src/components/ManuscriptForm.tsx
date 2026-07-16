import { useState } from 'react'
import type { FormEvent } from 'react'
import api, { ApiError } from '../services/api'
import { MANUSCRIPT_STATUS_LABELS } from '../types'
import type { Manuscript, ManuscriptStatus, Wrapped } from '../types'

const STATUSES = Object.keys(MANUSCRIPT_STATUS_LABELS) as ManuscriptStatus[]

const CATEGORIES = [
  { value: 'adult', label: 'Adult' },
  { value: 'young_adult', label: 'Young Adult' },
  { value: 'middle_grade', label: 'Middle Grade' },
]

export default function ManuscriptForm({
  initial, onSaved, onCancel, onDeleted,
}: {
  initial?: Manuscript
  onSaved: (m: Manuscript) => void
  onCancel: () => void
  onDeleted?: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [genre, setGenre] = useState(initial?.genre ?? '')
  const [category, setCategory] = useState(initial?.category ?? 'adult')
  const [wordCount, setWordCount] = useState(
    initial?.word_count?.toString() ?? '',
  )
  const [status, setStatus] = useState<ManuscriptStatus>(
    initial?.status ?? 'drafting',
  )
  const [pitch, setPitch] = useState(initial?.pitch ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)

    const payload = {
      title,
      genre: genre || null,
      category,
      word_count: wordCount ? Number(wordCount) : null,
      status,
      pitch: pitch || null,
      notes: notes || null,
    }

    try {
      const res = initial
        ? await api.put<Wrapped<Manuscript>>(`/manuscripts/${initial.id}`, payload)
        : await api.post<Wrapped<Manuscript>>('/manuscripts', payload)
      onSaved(res.data)
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, 'Could not reach the server.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="panel" onSubmit={handleSubmit}>
      <h2 className="panel__head">
        {initial ? `Edit — ${initial.title}` : 'Add a manuscript'}
      </h2>

      <div className="formgrid">
        <label className="field">
          <span className="field__label">Title</span>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} />
          {error?.firstError('title') && (
            <span className="field__error">{error.firstError('title')}</span>
          )}
        </label>

        <label className="field">
          <span className="field__label">Genre</span>
          <input
            value={genre} placeholder="Literary noir…"
            onChange={(e) => setGenre(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field__label">Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Word count</span>
          <input
            type="number" min={0} value={wordCount}
            onChange={(e) => setWordCount(e.target.value)}
          />
          {error?.firstError('word_count') && (
            <span className="field__error">{error.firstError('word_count')}</span>
          )}
        </label>

        <label className="field">
          <span className="field__label">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ManuscriptStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{MANUSCRIPT_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="field">
        <span className="field__label">Pitch</span>
        <textarea
          rows={2} value={pitch}
          placeholder="One or two lines — the elevator version."
          onChange={(e) => setPitch(e.target.value)}
        />
      </label>

      <label className="field">
        <span className="field__label">Notes</span>
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>

      {error && !error.errors && (
        <p className="form-error" role="alert">{error.message}</p>
      )}

      <div className="form-actions">
        {initial && onDeleted && (
          <button
            type="button"
            className="btn btn--ghost btn--danger btn--left"
            onClick={async () => {
              const n = initial.queries_count ?? 0
              const ok = window.confirm(
                `Delete “${initial.title}”${n ? ` and its ${n} query thread${n === 1 ? '' : 's'}` : ''}? This can't be undone.`,
              )
              if (!ok) return
              await api.delete(`/manuscripts/${initial.id}`)
              onDeleted()
            }}
          >
            Delete manuscript
          </button>
        )}
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? 'Saving…' : initial ? 'Save changes' : 'Add manuscript'}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
