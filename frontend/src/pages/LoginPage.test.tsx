import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ApiError } from '../services/api'
import { mockRoutes } from '../test/api'
import type { Routes } from '../test/api'
import { user } from '../test/fixtures'
import { renderApp } from '../test/render'

const loggedOut: Routes = {
  'GET /auth/user': () => {
    throw new ApiError(401, 'Unauthenticated.')
  },
}

async function fillAndSubmit(email: string, password: string) {
  await userEvent.type(screen.getByLabelText('Email'), email)
  await userEvent.type(screen.getByLabelText('Password'), password)
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('LoginPage', () => {
  it('requires both fields before contacting the server', async () => {
    const calls = mockRoutes(loggedOut)
    renderApp('/login')
    await screen.findByRole('heading', { name: 'Manuscript Tracker' })

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(screen.getByLabelText('Email')).toBeRequired()
    expect(screen.getByLabelText('Email')).toBeInvalid()
    expect(screen.getByLabelText('Password')).toBeRequired()
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(0)
  })

  it('rejects a malformed email before contacting the server', async () => {
    const calls = mockRoutes(loggedOut)
    renderApp('/login')
    await screen.findByRole('heading', { name: 'Manuscript Tracker' })

    await fillAndSubmit('not-an-email', 'password')

    expect(screen.getByLabelText('Email')).toBeInvalid()
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(0)
  })

  it('shows the field error from a failed login', async () => {
    const calls = mockRoutes({
      ...loggedOut,
      'POST /auth/login': () => {
        throw new ApiError(422, 'The given data was invalid.', {
          email: ['These credentials do not match our records.'],
        })
      },
    })
    renderApp('/login')
    await screen.findByRole('heading', { name: 'Manuscript Tracker' })

    await fillAndSubmit('robert@example.test', 'wrong')

    expect(calls.at(-1)).toEqual({
      method: 'POST',
      endpoint: '/auth/login',
      body: { email: 'robert@example.test', password: 'wrong' },
    })
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('These credentials do not match our records.')
    expect(alert).toHaveClass('form-error')
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled()
  })

  it('falls back to the message when there is no field error', async () => {
    mockRoutes({
      ...loggedOut,
      'POST /auth/login': () => {
        throw new ApiError(429, 'Too Many Attempts.')
      },
    })
    renderApp('/login')
    await screen.findByRole('heading', { name: 'Manuscript Tracker' })

    await fillAndSubmit('robert@example.test', 'password')

    expect(await screen.findByRole('alert')).toHaveTextContent('Too Many Attempts.')
  })

  it('explains a network failure', async () => {
    mockRoutes({
      ...loggedOut,
      'POST /auth/login': () => {
        throw new TypeError('Failed to fetch')
      },
    })
    renderApp('/login')
    await screen.findByRole('heading', { name: 'Manuscript Tracker' })

    await fillAndSubmit('robert@example.test', 'password')

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server.')
  })

  it('signs in and lands on the query ledger', async () => {
    mockRoutes({
      ...loggedOut,
      'POST /auth/login': () => ({ data: user }),
      'GET /reminders': () => ({ data: [] }),
      'GET /manuscripts': () => ({ data: [] }),
      'GET /agents': () => ({ data: [] }),
      'GET /queries': () => ({ data: [] }),
    })
    renderApp('/login')
    await screen.findByRole('heading', { name: 'Manuscript Tracker' })

    await fillAndSubmit('robert@example.test', 'password')

    expect(await screen.findByRole('heading', { name: 'Queries' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Robert Bagwell' })).toBeInTheDocument()
  })
})
