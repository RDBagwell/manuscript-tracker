import { useEffect, useState } from 'react'
import api from '../services/api'
import ManuscriptForm from '../components/ManuscriptForm'
import { MANUSCRIPT_STATUS_LABELS } from '../types'
import type { Manuscript, Wrapped } from '../types'

export default function ManuscriptsPage() {
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Manuscript | null>(null)

  useEffect(() => {
    api.get<Wrapped<Manuscript[]>>('/manuscripts')
      .then((res) => setManuscripts(res.data))
      .catch(() => setError('Could not load manuscripts.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="page">
      <div className="page__head">
        <h1 className="page__title">Manuscripts</h1>
        <button
          type="button" className="btn btn--primary"
          onClick={() => { setEditing(null); setShowForm((v) => !v) }}
        >
          {showForm && !editing ? 'Close form' : 'Add manuscript'}
        </button>
      </div>

      {showForm && (
        <ManuscriptForm
          key={editing?.id ?? 'new'}
          initial={editing ?? undefined}
          onSaved={(m) => {
            setManuscripts((prev) =>
              editing
                ? prev.map((x) => (x.id === m.id ? m : x))
                : [m, ...prev])
            setShowForm(false)
            setEditing(null)
          }}
          onCancel={() => { setShowForm(false); setEditing(null) }}
        />
      )}

      {error && <p className="form-error" role="alert">{error}</p>}
      {loading && <p className="muted">Pulling the files…</p>}

      {!loading && manuscripts.length === 0 && (
        <div className="empty"><p>No manuscripts on file yet.</p></div>
      )}

      <div className="cardgrid">
        {manuscripts.map((m) => (
          <article key={m.id} className="mscard">
            <div className="mscard__top">
              <h2 className="mscard__title">{m.title}</h2>
              <button
                type="button" className="btn btn--ghost"
                onClick={() => { setEditing(m); setShowForm(true) }}
              >
                Edit
              </button>
            </div>
            <p className="mscard__genre">
              {m.genre ?? 'Genre unset'}
              {m.word_count !== null && (
                <span className="thread__mono"> · {m.word_count.toLocaleString()} words</span>
              )}
            </p>
            <span className={`badge badge--ms-${m.status}`}>
              {MANUSCRIPT_STATUS_LABELS[m.status]}
            </span>
            {m.pitch && <p className="mscard__pitch">{m.pitch}</p>}
            {m.notes && <p className="muted mscard__notes">{m.notes}</p>}
          </article>
        ))}
      </div>
    </div>
  )
}
