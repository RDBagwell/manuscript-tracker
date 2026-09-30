import { useEffect, useMemo, useState } from 'react'
import api from '../../services/api'
import { useFetch } from '../../hooks/useFetch'
import type { Agent, Manuscript, Query, Wrapped } from '../../types'

/**
 * The ledger's data: the filtered thread list at `path`, plus the
 * manuscripts and agents the filters and new-query form pick from.
 * Mutations are applied locally from API responses — no refetch.
 */
export function useQueryLedger(path: string) {
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [refsError, setRefsError] = useState<string | null>(null)

  const {
    data: queries, setData: setQueries, loading, failed,
  } = useFetch<Query[]>(path, [])

  useEffect(() => {
    Promise.all([
      api.get<Wrapped<Manuscript[]>>('/manuscripts'),
      api.get<Wrapped<Agent[]>>('/agents'),
    ])
      .then(([m, a]) => {
        setManuscripts(m.data)
        setAgents(a.data)
      })
      .catch(() => setRefsError('Could not load manuscripts and agents.'))
  }, [])

  const openCount = useMemo(
    () => queries.filter((q) => !q.closed_at).length,
    [queries],
  )

  return {
    queries,
    manuscripts,
    agents,
    loading,
    error: failed ? 'Could not load queries.' : refsError,
    openCount,
    addQuery: (created: Query) => setQueries((prev) => [created, ...prev]),
    replaceQuery: (updated: Query) =>
      setQueries((prev) => prev.map((q) => (q.id === updated.id ? updated : q))),
    removeQuery: (id: number) =>
      setQueries((prev) => prev.filter((q) => q.id !== id)),
  }
}
