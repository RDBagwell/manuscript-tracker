import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockRoutes } from '../test/api'
import type { Routes } from '../test/api'
import { makeQuery, makeReminder, manuscript, user } from '../test/fixtures'
import { renderApp } from '../test/render'
import type { Reminder } from '../types'

const NOW = new Date('2026-06-15T09:00:00.000Z')

const overdue = makeReminder()
const upcoming = makeReminder({
  id: 51,
  reason: 'Check the full',
  due_at: '2026-06-20T12:00:00.000Z',
  due_in_days: 5,
  is_due: false,
})

function routes(overrides: Routes = {}): Routes {
  return {
    'GET /auth/user': () => ({ data: user }),
    'GET /reminders': () => ({ data: [overdue, upcoming] }),
    'GET /manuscripts': () => ({ data: [manuscript] }),
    'GET /agents': () => ({ data: [] }),
    'GET /queries': () => ({ data: [makeQuery()] }),
    ...overrides,
  }
}

async function openReminders() {
  renderApp('/reminders')
  await screen.findByRole('heading', { name: 'Due' })
}

function section(title: string): HTMLElement {
  return screen.getByRole('heading', { name: title }).closest('section')!
}

describe('RemindersPage', () => {
  beforeEach(() => {
    // Fake only Date: the snooze math reads Date.now(), while timers stay
    // real so user-event and the toast timeout behave normally.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('splits pending reminders into due and upcoming', async () => {
    mockRoutes(routes())
    await openReminders()

    expect(screen.getByText('1 due · 1 upcoming')).toBeInTheDocument()
    const due = section('Due')
    expect(within(due).getByText('Nudge on the partial')).toBeInTheDocument()
    expect(within(due).getByText('5d overdue')).toHaveClass('rem-when--over')
    expect(within(due).getByText('The Salt Road → Jen Nadol')).toBeInTheDocument()
    expect(within(section('Upcoming')).getByText('in 5d')).toBeInTheDocument()

    // The nav badge counts what's due.
    expect(screen.getByRole('link', { name: /Reminders/ })).toHaveTextContent('Reminders1')
  })

  it('completing a reminder clears it and confirms with a toast', async () => {
    const done: Reminder = { ...overdue, completed_at: NOW.toISOString(), is_due: false }
    const calls = mockRoutes(routes({ 'POST /reminders/50/complete': () => ({ data: done }) }))
    await openReminders()

    await userEvent.click(within(section('Due')).getByRole('button', { name: 'Complete' }))

    expect(calls.at(-1)).toEqual({ method: 'POST', endpoint: '/reminders/50/complete', body: {} })
    expect(await screen.findByText('Done: Nudge on the partial')).toHaveClass('toast')
    expect(within(section('Due')).getByText('Nothing due. The desk is quiet.')).toBeInTheDocument()
    expect(screen.getByText('0 due · 1 upcoming')).toBeInTheDocument()
  })

  it('snoozing an overdue reminder pushes it a week from today', async () => {
    const snoozedTo = '2026-06-22T09:00:00.000Z'
    const snoozed: Reminder = { ...overdue, due_at: snoozedTo, due_in_days: 7, is_due: false }
    const calls = mockRoutes(routes({ 'PUT /reminders/50': () => ({ data: snoozed }) }))
    await openReminders()

    await userEvent.click(within(section('Due')).getByRole('button', { name: 'Snooze 1w' }))

    // Overdue, so the week counts from now rather than from the old due date.
    expect(calls.at(-1)).toEqual({
      method: 'PUT', endpoint: '/reminders/50', body: { due_at: snoozedTo },
    })
    expect(await screen.findByText('Snoozed — now due Jun 22, 2026')).toBeInTheDocument()
    expect(within(section('Upcoming')).getByText('Nudge on the partial')).toBeInTheDocument()
    expect(screen.getByText('0 due · 2 upcoming')).toBeInTheDocument()
  })

  it('snoozing a future reminder pushes it a week past its due date', async () => {
    const calls = mockRoutes(routes({
      'PUT /reminders/51': () => ({ data: { ...upcoming, due_at: '2026-06-27T12:00:00.000Z' } }),
    }))
    await openReminders()

    await userEvent.click(within(section('Upcoming')).getByRole('button', { name: 'Snooze 1w' }))

    expect(calls.at(-1)?.body).toEqual({ due_at: '2026-06-27T12:00:00.000Z' })
  })

  it('switches to completed reminders', async () => {
    const calls = mockRoutes(routes({
      'GET /reminders': (_body, endpoint) => ({
        data: endpoint.endsWith('filter=completed')
          ? [makeReminder({ id: 52, reason: 'Sent the full', completed_at: '2026-06-01T10:00:00.000Z' })]
          : [overdue],
      }),
    }))
    renderApp('/reminders')
    await screen.findByText('1 due · 0 upcoming')

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Show' }), 'completed')

    const completed = await screen.findByRole('heading', { name: 'Completed' })
    expect(within(completed.closest('section')!).getByText('done Jun 1, 2026')).toBeInTheDocument()
    expect(calls.at(-1)?.endpoint).toBe('/reminders?filter=completed')
    expect(screen.queryByRole('button', { name: 'Complete' })).not.toBeInTheDocument()
  })
})
