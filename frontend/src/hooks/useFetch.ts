import { useEffect, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import api from '../services/api'
import type { Wrapped } from '../types'

interface FetchState<T> {
  data: T
  /** Local edits (create, replace, remove) without a refetch. */
  setData: Dispatch<SetStateAction<T>>
  loading: boolean
  failed: boolean
}

/**
 * GETs `path` (a `{ data: T }` endpoint) and refetches whenever it
 * changes. Loading is derived — the last settled path lags the requested
 * one — instead of set at the top of the effect, and a response for a
 * path that is no longer current is dropped rather than overwriting a
 * newer one. Previous data stays on screen while the next page loads.
 */
export function useFetch<T>(path: string, initial: T): FetchState<T> {
  const [data, setData] = useState<T>(initial)
  const [settled, setSettled] = useState<{ path: string; failed: boolean } | null>(null)

  useEffect(() => {
    let current = true
    api.get<Wrapped<T>>(path)
      .then((res) => {
        if (!current) return
        setData(res.data)
        setSettled({ path, failed: false })
      })
      .catch(() => {
        if (current) setSettled({ path, failed: true })
      })
    return () => {
      current = false
    }
  }, [path])

  const loading = settled?.path !== path
  return { data, setData, loading, failed: !loading && settled.failed }
}
