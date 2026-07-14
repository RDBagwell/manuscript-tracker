const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost/api'

// Ported from api.js with one fix: the original spread `...options` after
// setting headers, so any call passing options.headers replaced the merged
// header object entirely and silently dropped the JSON defaults. Options
// are now spread first; headers and credentials are composed after.
const request = async <T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T | null> => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers ?? {}),
    },
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`)
  }

  return response.status === 204 ? null : (response.json() as Promise<T>)
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, data: unknown) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(endpoint: string, data: unknown) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
}

export default api
