import { useEffect, useState } from 'react'
import api from '../../services/api'
import type { Query, Wrapped } from '../../types'

/**
 * A thread's full record (with its event log), fetched the first time
 * the row is expanded. List rows arrive without events; a thread that
 * already carries them (e.g. just created) needs no fetch. `setDetail`
 * lets a newly recorded event replace it in place.
 */
export function useThreadDetail(query: Query, expanded: boolean) {
  const [detail, setDetail] = useState<Query | null>(
    query.events ? query : null,
  )
  const [failed, setFailed] = useState(false)

  // Collapsing forgets a failed load, so expanding again retries it.
  if (failed && !expanded) setFailed(false)

  useEffect(() => {
    if (!expanded || detail || failed) return
    api.get<Wrapped<Query>>(`/queries/${query.id}`)
      .then((res) => setDetail(res.data))
      .catch(() => setFailed(true))
  }, [expanded, detail, failed, query.id])

  return {
    detail,
    setDetail,
    loading: expanded && !detail && !failed,
  }
}
