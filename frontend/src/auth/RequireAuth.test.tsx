import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ApiError } from '../services/api'
import { mockRoutes } from '../test/api'
import { user } from '../test/fixtures'
import { renderApp } from '../test/render'

const PROTECTED = ['/queries', '/manuscripts', '/agents', '/templates', '/reminders', '/stats', '/profile']

describe('RequireAuth', () => {
  it.each(PROTECTED)('redirects %s to the login page when logged out', async (path) => {
    const calls = mockRoutes({
      'GET /auth/user': () => {
        throw new ApiError(401, 'Unauthenticated.')
      },
    })
    renderApp(path)

    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    // Only the session probe went out: no page data leaked into the request log.
    expect(calls.map((c) => c.endpoint)).toEqual(['/auth/user'])
  })

  it('holds a boot screen while the session probe is in flight', async () => {
    mockRoutes({ 'GET /auth/user': () => new Promise(() => {}) })
    renderApp('/stats')

    expect(await screen.findByText('Opening the case files…')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument()
  })

  it('renders the protected page for a signed-in user', async () => {
    mockRoutes({
      'GET /auth/user': () => ({ data: user }),
      'GET /reminders': () => ({ data: [] }),
      'GET /stats': () => new Promise(() => {}),
    })
    renderApp('/stats')

    expect(await screen.findByRole('heading', { name: 'Stats' })).toBeInTheDocument()
  })

  it('sends a signed-in user away from the login page', async () => {
    mockRoutes({
      'GET /auth/user': () => ({ data: user }),
      'GET /reminders': () => ({ data: [] }),
      'GET /manuscripts': () => ({ data: [] }),
      'GET /agents': () => ({ data: [] }),
      'GET /queries': () => ({ data: [] }),
    })
    renderApp('/login')

    expect(await screen.findByRole('heading', { name: 'Queries' })).toBeInTheDocument()
  })

  it('signing out returns to the login page', async () => {
    mockRoutes({
      'GET /auth/user': () => ({ data: user }),
      'GET /reminders': () => ({ data: [] }),
      'GET /stats': () => new Promise(() => {}),
      'POST /auth/logout': () => undefined,
    })
    renderApp('/stats')
    await screen.findByRole('heading', { name: 'Stats' })

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })
})
