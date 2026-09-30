import type {
  Agency, Agent, Manuscript, Query, QueryEvent, Reminder, User,
} from '../types'

export const user: User = { id: 1, name: 'Robert Bagwell', email: 'robert@example.test' }

export const manuscript: Manuscript = {
  id: 10,
  title: 'The Salt Road',
  genre: 'literary noir',
  category: 'adult',
  word_count: 92000,
  status: 'querying',
  pitch: null,
  notes: null,
}

export const agency: Agency = {
  id: 20,
  name: 'Harbor Lit',
  website: null,
  one_no_means_all_no: true,
  notes: null,
}

export function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 30,
    agency_id: agency.id,
    name: 'Jen Nadol',
    email: null,
    title: null,
    open_to_queries: true,
    genres: ['noir'],
    mswl: null,
    submission_method: null,
    response_window_days: null,
    notes: null,
    agency,
    ...overrides,
  }
}

export function makeEvent(overrides: Partial<QueryEvent> = {}): QueryEvent {
  return {
    id: 100,
    type: 'sent',
    type_label: 'Query Sent',
    happened_at: '2026-05-12T09:00:00.000Z',
    notes: null,
    ...overrides,
  }
}

export function makeQuery(overrides: Partial<Query> = {}): Query {
  return {
    id: 40,
    manuscript_id: manuscript.id,
    agent_id: 30,
    status: 'sent',
    personalization: null,
    materials: null,
    wave: 1,
    sent_at: '2026-05-12T09:00:00.000Z',
    closed_at: null,
    days_out: 12,
    manuscript,
    agent: makeAgent(),
    ...overrides,
  }
}

export function makeReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: 50,
    remindable_type: 'query',
    remindable_id: 40,
    target: 'The Salt Road → Jen Nadol',
    due_at: '2026-06-10T12:00:00.000Z',
    due_in_days: -5,
    is_due: true,
    reason: 'Nudge on the partial',
    notes: null,
    completed_at: null,
    ...overrides,
  }
}
