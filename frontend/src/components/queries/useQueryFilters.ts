import { useState } from 'react'

export interface QueryFilterState {
  manuscriptId: string
  setManuscriptId: (id: string) => void
  status: string
  setStatus: (status: string) => void
  openOnly: boolean
  setOpenOnly: (open: boolean) => void
  /** "field:dir", e.g. "sent_at:desc" — the server whitelists the field. */
  sort: string
  setSort: (sort: string) => void
  /** The /queries endpoint these filters select. */
  path: string
}

export function useQueryFilters(): QueryFilterState {
  const [manuscriptId, setManuscriptId] = useState('')
  const [status, setStatus] = useState('')
  const [openOnly, setOpenOnly] = useState(false)
  const [sort, setSort] = useState('sent_at:desc')

  const params = new URLSearchParams()
  if (manuscriptId) params.set('manuscript_id', manuscriptId)
  if (status) params.set('status', status)
  if (openOnly) params.set('open', '1')
  const [field, dir] = sort.split(':')
  params.set('sort', field)
  params.set('dir', dir)

  return {
    manuscriptId, setManuscriptId,
    status, setStatus,
    openOnly, setOpenOnly,
    sort, setSort,
    path: `/queries?${params}`,
  }
}
