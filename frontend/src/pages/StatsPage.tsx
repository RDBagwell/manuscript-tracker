import { useEffect, useState } from 'react'
import api from '../services/api'
import { QUERY_STATUS_LABELS } from '../types'
import type { QueryStatus, StatBlock, StatsResponse } from '../types'

const BAR_ORDER: QueryStatus[] = [
  'offer', 'full', 'revise_resubmit', 'partial', 'sent',
  'queued', 'rejected', 'no_response', 'withdrawn',
]

function pct(rate: number | null): string {
  return rate === null ? '—' : `${Math.round(rate * 100)}%`
}

function days(value: number | null): string {
  return value === null ? '—' : `${value}d`
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatsResponse['data'] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<StatsResponse>('/stats')
      .then((res) => setStats(res.data))
      .catch(() => setError('Could not load stats.'))
  }, [])

  return (
    <div className="page">
      <div className="page__head">
        <h1 className="page__title">Stats</h1>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      {!stats && !error && <p className="muted">Running the numbers…</p>}

      {stats && (
        <>
          <StatCard title="All manuscripts" block={stats.overall} />
          {stats.manuscripts
            .filter((m) => m.totals.threads > 0)
            .map((m) => (
              <StatCard key={m.id} title={m.title} block={m} />
            ))}
        </>
      )}
    </div>
  )
}

function StatCard({ title, block }: { title: string; block: StatBlock }) {
  const total = Object.values(block.status_counts).reduce((a, b) => a + (b ?? 0), 0)
  const maxWait = Math.max(1, ...block.open_threads.map((t) => t.days))

  return (
    <section className="statcard">
      <div className="statcard__head">
        <h2 className="statcard__title">{title}</h2>
        <span className="thread__mono">
          {block.totals.sent} sent · {block.totals.open} open
        </span>
      </div>

      {total > 0 && (
        <>
          <div className="statbar" role="img" aria-label="Thread status breakdown">
            {BAR_ORDER.map((status) => {
              const count = block.status_counts[status]
              if (!count) return null
              return (
                <span
                  key={status}
                  className={`statbar__seg statbar__seg--${status}`}
                  style={{ flexGrow: count }}
                  title={`${QUERY_STATUS_LABELS[status]}: ${count}`}
                />
              )
            })}
          </div>
          <div className="statlegend">
            {BAR_ORDER.map((status) => {
              const count = block.status_counts[status]
              if (!count) return null
              return (
                <span key={status} className="statlegend__item">
                  <span className={`statlegend__dot statbar__seg--${status}`} />
                  {QUERY_STATUS_LABELS[status]} {count}
                </span>
              )
            })}
          </div>
        </>
      )}

      <dl className="statnums">
        <div>
          <dt>Request rate</dt>
          <dd>{pct(block.rates.request_rate)}</dd>
        </div>
        <div>
          <dt>Response rate</dt>
          <dd>{pct(block.rates.response_rate)}</dd>
        </div>
        <div>
          <dt>Avg first response</dt>
          <dd>{days(block.latency.avg_days_to_first_response)}</dd>
        </div>
        <div>
          <dt>Avg to rejection</dt>
          <dd>{days(block.latency.avg_days_to_rejection)}</dd>
        </div>
        <div>
          <dt>Requests</dt>
          <dd>{block.outcomes.requests}</dd>
        </div>
        <div>
          <dt>Offers</dt>
          <dd>{block.outcomes.offers}</dd>
        </div>
      </dl>

      {block.open_threads.length > 0 && (
        <div className="waitlist">
          <h3 className="casefile__head">Waiting</h3>
          {block.open_threads.map((t) => (
            <div key={`${t.agent}-${t.days}`} className="waitrow">
              <span className="waitrow__agent">{t.agent}</span>
              <span className="waitrow__track">
                <span
                  className="waitrow__fill"
                  style={{ width: `${(t.days / maxWait) * 100}%` }}
                />
              </span>
              <span className="thread__mono">{t.days}d</span>
            </div>
          ))}
        </div>
      )}

      {block.totals.sent === 0 && (
        <p className="muted">No queries sent yet.</p>
      )}
    </section>
  )
}
