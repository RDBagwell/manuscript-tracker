// Relative by default: the client inherits the page's origin, so the
// nginx same-origin architecture works on any port without config.
const API_BASE_URL = import.meta.env.VITE_API_URL?.trim() || '/api'

// /sanctum/csrf-cookie lives at the app origin, not under /api.
// (Empty string for relative bases — the fetch below stays relative.)
const APP_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '')

export class ApiError extends Error {
  status: number
  errors?: Record<string, string[]>

  constructor(status: number, message: string, errors?: Record<string, string[]>) {
    super(message)
    this.status = status
    this.errors = errors
  }

  firstError(field: string): string | null {
    return this.errors?.[field]?.[0] ?? null
  }
}

function readCookie(name: string): string | null {
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null
}

/**
 * Sanctum SPA CSRF: fetch the cookie once, echo it back as a header on
 * every mutating request. Laravel 13's origin-aware middleware may pass
 * same-origin requests on Sec-Fetch-Site alone, but the token path is
 * the contract that works everywhere — including the :3000 dev origin.
 */
async function ensureCsrfCookie(): Promise<void> {
  if (readCookie('XSRF-TOKEN')) return
  await fetch(`${APP_ORIGIN}/sanctum/csrf-cookie`, { credentials: 'include' })
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  retried = false,
): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase()
  const mutating = method !== 'GET'

  if (mutating) await ensureCsrfCookie()
  const token = mutating ? readCookie('XSRF-TOKEN') : null

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { 'X-XSRF-TOKEN': token } : {}),
      ...(options.headers ?? {}),
    },
  })

  // Stale token (session rotated): drop the cookie, refetch, retry once.
  if (response.status === 419 && !retried) {
    document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/'
    return request<T>(endpoint, options, true)
  }

  if (!response.ok) {
    let body: { message?: string; errors?: Record<string, string[]> } | null = null
    try {
      body = await response.json()
    } catch {
      // non-JSON error body; fall through to statusText
    }
    throw new ApiError(
      response.status,
      body?.message ?? `${response.status} ${response.statusText}`,
      body?.errors,
    )
  }

  return response.status === 204 ? (undefined as T) : response.json()
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, data: unknown) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(endpoint: string, data: unknown) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (endpoint: string) =>
    request<void>(endpoint, { method: 'DELETE' }),
}

export default api
