import { vi } from 'vitest'
import api from '../services/api'

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'
type Handler = (body: unknown, endpoint: string) => unknown
export type Routes = Partial<Record<`${Method} ${string}`, Handler>>

export interface ApiCall {
  method: Method
  endpoint: string
  body?: unknown
}

/**
 * Programs the mocked api client with a route table keyed by
 * "METHOD /path" (query string ignored when matching). A handler's return
 * value resolves the request; a thrown error rejects it, just as the real
 * client throws ApiError. Unmatched requests fail loudly.
 *
 * Returns the log of calls, in order, for asserting on what was sent.
 */
export function mockRoutes(routes: Routes): ApiCall[] {
  const calls: ApiCall[] = []

  const respond = (method: Method, endpoint: string, body?: unknown) => {
    calls.push({ method, endpoint, body })
    const handler = routes[`${method} ${endpoint.split('?')[0]}`]
    if (!handler) {
      return Promise.reject(new Error(`Unmocked request: ${method} ${endpoint}`))
    }
    try {
      return Promise.resolve(handler(body, endpoint))
    } catch (err) {
      return Promise.reject(err instanceof Error ? err : new Error(String(err)))
    }
  }

  vi.mocked(api.get).mockImplementation((endpoint) => respond('GET', endpoint))
  vi.mocked(api.post).mockImplementation((endpoint, data) => respond('POST', endpoint, data))
  vi.mocked(api.put).mockImplementation((endpoint, data) => respond('PUT', endpoint, data))
  vi.mocked(api.delete).mockImplementation((endpoint) => respond('DELETE', endpoint) as Promise<void>)

  return calls
}
