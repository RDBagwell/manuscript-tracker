import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MockInstance } from 'vitest'
import { ApiError } from '../services/api'
import { mockRoutes } from '../test/api'
import type { Routes } from '../test/api'
import {
  makeAgent, makeEvent, makeQuery, manuscript, user,
} from '../test/fixtures'
import { renderApp } from '../test/render'
import type { EventStoreResponse, Query, QueryStoreResponse } from '../types'

const sent = makeQuery()
const rejected = makeQuery({
  id: 41,
  agent_id: 31,
  status: 'rejected',
  wave: 2,
  closed_at: '2026-05-30T09:00:00.000Z',
  agent: makeAgent({ id: 31, name: 'Sam Ortiz', agency: undefined, agency_id: null }),
})
const detail: Query = {
  ...sent,
  personalization: 'Loved her noir panel',
  events: [makeEvent({ id: 100, type_label: 'Query Sent' })],
}
const closedAgent = makeAgent({ id: 32, name: 'Ada Pell', open_to_queries: false })

function routes(overrides: Routes = {}): Routes {
  return {
    'GET /auth/user': () => ({ data: user }),
    'GET /reminders': () => ({ data: [] }),
    'GET /manuscripts': () => ({ data: [manuscript] }),
    'GET /agents': () => ({ data: [makeAgent(), closedAgent] }),
    'GET /queries': () => ({ data: [sent, rejected] }),
    'GET /queries/40': () => ({ data: detail }),
    ...overrides,
  }
}

async function openLedger() {
  renderApp('/queries')
  return screen.findByRole('button', { name: /Jen Nadol/ })
}

describe('QueriesPage', () => {
  let confirm: MockInstance<typeof window.confirm>

  beforeEach(() => {
    confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('lists threads with status, wave and an open count', async () => {
    mockRoutes(routes())
    const row = await openLedger()

    expect(within(row).getByText('Harbor Lit')).toBeInTheDocument()
    expect(within(row).getByText('Sent')).toHaveClass('badge', 'badge--sent')
    expect(within(row).getByText('Wave 1')).toBeInTheDocument()
    expect(within(row).getByText('Day 12')).toBeInTheDocument()

    const other = screen.getByRole('button', { name: /Sam Ortiz/ })
    expect(within(other).getByText('No agency on file')).toBeInTheDocument()
    expect(within(other).getByText('Rejected')).toHaveClass('badge--rejected')

    expect(screen.getByText(/2 threads · 1 open/)).toBeInTheDocument()
  })

  it('expands a thread into its correspondence log', async () => {
    const calls = mockRoutes(routes())
    const row = await openLedger()

    await userEvent.click(row)

    expect(row).toHaveAttribute('aria-expanded', 'true')
    expect(await screen.findByText('Query Sent')).toBeInTheDocument()
    expect(screen.getByText('Loved her noir panel')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Correspondence log' })).toBeInTheDocument()
    expect(calls.some((c) => c.endpoint === '/queries/40')).toBe(true)

    await userEvent.click(row)
    expect(row).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Correspondence log')).not.toBeInTheDocument()
  })

  it('logging an event updates the thread status in the ledger', async () => {
    const partial: Query = {
      ...detail,
      status: 'partial',
      events: [
        ...detail.events!,
        makeEvent({ id: 101, type: 'partial_requested', type_label: 'Partial Requested', notes: 'First 50' }),
      ],
    }
    const calls = mockRoutes(routes({
      'POST /queries/40/events': (): EventStoreResponse => ({
        event: partial.events![1],
        query: { data: partial },
      }),
    }))
    const row = await openLedger()
    await userEvent.click(row)
    await screen.findByText('Query Sent')

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Event' }), 'partial_requested')
    await userEvent.type(screen.getByRole('textbox', { name: 'Notes' }), 'First 50')
    await userEvent.click(screen.getByRole('button', { name: 'Record event' }))

    expect(calls.find((c) => c.method === 'POST')).toEqual({
      method: 'POST',
      endpoint: '/queries/40/events',
      body: { type: 'partial_requested', happened_at: undefined, notes: 'First 50' },
    })
    expect(await within(row).findByText('Partial')).toHaveClass('badge--partial')
    expect(screen.getByText('Partial Requested')).toBeInTheDocument()
    expect(screen.getByText('· First 50')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Notes' })).toHaveValue('')
  })

  it('shows a failed event as an error inside the form', async () => {
    mockRoutes(routes({
      'POST /queries/40/events': () => {
        throw new ApiError(422, 'The selected type is invalid.')
      },
    }))
    await userEvent.click(await openLedger())
    await screen.findByText('Query Sent')

    await userEvent.click(screen.getByRole('button', { name: 'Record event' }))

    expect(await screen.findByText('The selected type is invalid.')).toHaveClass('form-error')
  })

  it('shows closed-agency and closed-agent advisories from meta as a warning, not an error', async () => {
    const created = makeQuery({ id: 42, agent_id: closedAgent.id, status: 'queued', agent: closedAgent, sent_at: null, days_out: null, events: [] })
    const warnings = [
      'Harbor Lit has a "one no means all no" policy and another Harbor Lit agent has already rejected The Salt Road.',
      'Ada Pell is currently marked closed to queries.',
    ]
    const calls = mockRoutes(routes({
      'POST /queries': (): QueryStoreResponse => ({ data: created, meta: { warnings } }),
    }))
    await openLedger()

    await userEvent.click(screen.getByRole('button', { name: 'Log query' }))
    const form = screen.getByRole('heading', { name: 'Log a query' }).closest('form')!
    await userEvent.selectOptions(within(form).getByRole('combobox', { name: 'Manuscript' }), 'The Salt Road')
    await userEvent.selectOptions(within(form).getByRole('combobox', { name: 'Agent' }), '32')
    await userEvent.type(within(form).getByRole('spinbutton', { name: 'Wave' }), '3')
    await userEvent.click(within(form).getByRole('button', { name: 'Log query' }))

    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
      manuscript_id: 10,
      agent_id: 32,
      wave: 3,
      sent_at: undefined,
      personalization: undefined,
      materials: undefined,
    })

    const warnbox = await screen.findByText('Before you lick the stamp')
    const box = warnbox.closest('.warnbox')!
    expect(box).toHaveAttribute('role', 'alert')
    for (const w of warnings) {
      expect(within(box as HTMLElement).getByText(w)).toBeInTheDocument()
    }
    // Advisories never masquerade as failures.
    expect(document.querySelector('.form-error')).toBeNull()

    // The thread was still created: form closed, new row on top and open.
    expect(screen.queryByRole('heading', { name: 'Log a query' })).not.toBeInTheDocument()
    const rows = screen.getAllByRole('button', { expanded: true })
    expect(rows[0]).toHaveTextContent('Ada Pell')
    expect(screen.getByText(/3 threads · 2 open/)).toBeInTheDocument()

    await userEvent.click(within(box as HTMLElement).getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByText('Before you lick the stamp')).not.toBeInTheDocument()
  })

  it('shows a rejected new query as an error, not a warning', async () => {
    mockRoutes(routes({
      'POST /queries': () => {
        throw new ApiError(422, 'Invalid', {
          agent_id: ['A query thread for this manuscript and agent already exists.'],
        })
      },
    }))
    await openLedger()

    await userEvent.click(screen.getByRole('button', { name: 'Log query' }))
    const form = screen.getByRole('heading', { name: 'Log a query' }).closest('form')!
    await userEvent.selectOptions(within(form).getByRole('combobox', { name: 'Manuscript' }), 'The Salt Road')
    await userEvent.selectOptions(within(form).getByRole('combobox', { name: 'Agent' }), '30')
    await userEvent.click(within(form).getByRole('button', { name: 'Log query' }))

    expect(
      await screen.findByText('A query thread for this manuscript and agent already exists.'),
    ).toHaveClass('form-error')
    expect(screen.queryByText('Before you lick the stamp')).not.toBeInTheDocument()
  })

  it('sends filters and sorting to the API', async () => {
    const calls = mockRoutes(routes())
    await openLedger()

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'rejected')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Open only' }))
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Sort' }), 'wave:asc')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Manuscript' }), 'The Salt Road')

    await waitFor(() => {
      expect(calls.at(-1)?.endpoint).toBe(
        '/queries?manuscript_id=10&status=rejected&open=1&sort=wave&dir=asc',
      )
    })
    expect(calls.filter((c) => c.endpoint.startsWith('/queries?'))[0].endpoint)
      .toBe('/queries?sort=sent_at&dir=desc')
  })

  it('shows the empty state when nothing matches', async () => {
    mockRoutes(routes({ 'GET /queries': () => ({ data: [] }) }))
    renderApp('/queries')

    expect(await screen.findByText('No query threads match.')).toBeInTheDocument()
    expect(screen.getByText(/0 threads · 0 open/)).toBeInTheDocument()
  })

  it('reports a failed load', async () => {
    mockRoutes(routes({
      'GET /queries': () => {
        throw new ApiError(500, 'Server Error')
      },
    }))
    renderApp('/queries')

    expect(await screen.findByText('Could not load queries.')).toHaveClass('form-error')
  })

  it('deletes a thread after confirmation', async () => {
    const calls = mockRoutes(routes({ 'DELETE /queries/40': () => undefined }))
    await userEvent.click(await openLedger())
    await screen.findByText('Query Sent')

    await userEvent.click(screen.getByRole('button', { name: 'Delete thread' }))

    expect(confirm).toHaveBeenCalledWith(
      "Delete this query thread and its 1 logged event? This can't be undone.",
    )
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Jen Nadol/ })).not.toBeInTheDocument()
    })
    expect(calls.some((c) => c.method === 'DELETE' && c.endpoint === '/queries/40')).toBe(true)
  })

  it('sets a reminder on a thread', async () => {
    const calls = mockRoutes(routes({
      'POST /reminders': () => ({ data: { due_at: '2026-07-01T12:00:00.000Z' } }),
    }))
    await userEvent.click(await openLedger())
    await screen.findByText('Query Sent')

    await userEvent.click(screen.getByRole('button', { name: 'Set reminder' }))
    await userEvent.type(screen.getByLabelText('Due'), '2026-07-01')
    await userEvent.type(screen.getByRole('textbox', { name: 'Reason' }), 'Nudge')
    await userEvent.click(screen.getByRole('button', { name: 'Set' }))

    expect(calls.find((c) => c.endpoint === '/reminders' && c.method === 'POST')?.body).toEqual({
      remindable_type: 'query',
      remindable_id: 40,
      due_at: '2026-07-01',
      reason: 'Nudge',
    })
    expect(await screen.findByText('Reminder set for Jul 1, 2026.')).toBeInTheDocument()
  })
})
