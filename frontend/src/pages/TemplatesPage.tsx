import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import api, { ApiError } from '../services/api'
import { useToast } from '../components/Toasts'
import { TEMPLATE_TYPE_LABELS, formatDate } from '../types'
import type { Manuscript, Template, TemplateType, Wrapped } from '../types'

const TYPES = Object.keys(TEMPLATE_TYPE_LABELS) as TemplateType[]

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState('')
  const [openId, setOpenId] = useState<number | 'new' | null>(null)

  useEffect(() => {
    api.get<Wrapped<Manuscript[]>>('/manuscripts')
      .then((res) => setManuscripts(res.data))
      .catch(() => { /* picker degrades */ })
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)
    const qs = typeFilter ? `?type=${typeFilter}` : ''
    api.get<Wrapped<Template[]>>(`/templates${qs}`)
      .then((res) => setTemplates(res.data))
      .catch(() => setError('Could not load templates.'))
      .finally(() => setLoading(false))
  }, [typeFilter])

  const sorted = useMemo(() => templates, [templates])

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Templates</h1>
          <p className="page__meta">{templates.length} on file</p>
        </div>
        <div className="filters">
          <label className="field field--inline">
            <span className="field__label">Type</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>{TEMPLATE_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </label>
          <button
            type="button" className="btn btn--primary"
            onClick={() => setOpenId((cur) => (cur === 'new' ? null : 'new'))}
          >
            {openId === 'new' ? 'Close form' : 'New template'}
          </button>
        </div>
      </div>

      {openId === 'new' && (
        <TemplateEditor
          manuscripts={manuscripts}
          onSaved={(t) => {
            setTemplates((prev) => [t, ...prev])
            setOpenId(t.id)
          }}
          onCancel={() => setOpenId(null)}
        />
      )}

      {error && <p className="form-error" role="alert">{error}</p>}
      {loading && <p className="muted">Pulling the files…</p>}

      {!loading && templates.length === 0 && (
        <div className="empty">
          <p>No templates{typeFilter ? ' of this type' : ''} yet.</p>
          <p className="muted">The master query letter is the one to start with.</p>
        </div>
      )}

      <ul className="threadlist">
        {sorted.map((t) => (
          <li key={t.id} className={`thread ${openId === t.id ? 'thread--open' : ''}`}>
            <button
              type="button"
              className="thread__row"
              aria-expanded={openId === t.id}
              onClick={() => setOpenId((cur) => (cur === t.id ? null : t.id))}
            >
              <span className="thread__agent">
                <span className="thread__agent-name">{t.name}</span>
                <span className="thread__agency">
                  {t.manuscript?.title ?? 'General'}
                </span>
              </span>
              <span className="chip">{t.type_label}</span>
              <span className="thread__mono">{wordCount(t.body)} words</span>
              <span className="thread__mono">{formatDate(t.updated_at)}</span>
            </button>

            {openId === t.id && (
              <div className="casefile">
                <TemplateEditor
                  initial={t}
                  manuscripts={manuscripts}
                  onSaved={(saved) => {
                    setTemplates((prev) =>
                      prev.map((x) => (x.id === saved.id ? saved : x)))
                  }}
                  onCancel={() => setOpenId(null)}
                  onDeleted={() => {
                    setTemplates((prev) => prev.filter((x) => x.id !== t.id))
                    setOpenId(null)
                  }}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function TemplateEditor({
  initial, manuscripts, onSaved, onCancel, onDeleted,
}: {
  initial?: Template
  manuscripts: Manuscript[]
  onSaved: (t: Template) => void
  onCancel: () => void
  onDeleted?: () => void
}) {
  const toast = useToast()
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState<TemplateType>(initial?.type ?? 'query_letter')
  const [manuscriptId, setManuscriptId] = useState(
    initial?.manuscript_id?.toString() ?? '',
  )
  const [body, setBody] = useState(initial?.body ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  async function copy() {
    await navigator.clipboard.writeText(body)
    toast(`Copied "${name || 'template'}" — ${wordCount(body)} words`)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const payload = {
      name,
      type,
      manuscript_id: manuscriptId ? Number(manuscriptId) : null,
      body,
    }
    try {
      const res = initial
        ? await api.put<Wrapped<Template>>(`/templates/${initial.id}`, payload)
        : await api.post<Wrapped<Template>>('/templates', payload)
      onSaved(res.data)
      toast(initial ? 'Template saved' : 'Template created')
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, 'Could not reach the server.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className={initial ? 'templateform' : 'panel templateform'} onSubmit={handleSubmit}>
      {!initial && <h2 className="panel__head">New template</h2>}

      <div className="formgrid">
        <label className="field">
          <span className="field__label">Name</span>
          <input required value={name} onChange={(e) => setName(e.target.value)} />
          {error?.firstError('name') && (
            <span className="field__error">{error.firstError('name')}</span>
          )}
        </label>

        <label className="field">
          <span className="field__label">Type</span>
          <select value={type} onChange={(e) => setType(e.target.value as TemplateType)}>
            {TYPES.map((t) => (
              <option key={t} value={t}>{TEMPLATE_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Manuscript</span>
          <select
            value={manuscriptId}
            onChange={(e) => setManuscriptId(e.target.value)}
          >
            <option value="">General (all manuscripts)</option>
            {manuscripts.map((m) => (
              <option key={m.id} value={m.id}>{m.title}</option>
            ))}
          </select>
          {error?.firstError('manuscript_id') && (
            <span className="field__error">{error.firstError('manuscript_id')}</span>
          )}
        </label>
      </div>

      <label className="field">
        <span className="field__label">Body</span>
        <textarea
          className="templatebody"
          rows={14}
          required
          value={body}
          placeholder="Dear [Agent], …"
          onChange={(e) => setBody(e.target.value)}
        />
        <span className="templatecount">{wordCount(body)} words</span>
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
              if (!window.confirm(`Delete "${initial.name}"? This can't be undone.`)) return
              await api.delete(`/templates/${initial.id}`)
              toast('Template deleted')
              onDeleted()
            }}
          >
            Delete
          </button>
        )}
        <button type="button" className="btn" onClick={copy} disabled={!body}>
          Copy to clipboard
        </button>
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? 'Saving…' : initial ? 'Save changes' : 'Create template'}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          {initial ? 'Close' : 'Cancel'}
        </button>
      </div>
    </form>
  )
}
