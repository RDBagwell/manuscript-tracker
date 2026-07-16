export interface User {
  id: number
  name: string
  email: string
}

export type ManuscriptStatus =
  | 'drafting' | 'querying' | 'production' | 'published' | 'shelved'

export type QueryStatus =
  | 'queued' | 'sent' | 'partial' | 'full' | 'revise_resubmit'
  | 'offer' | 'rejected' | 'no_response' | 'withdrawn'

export type QueryEventType =
  | 'sent' | 'partial_requested' | 'materials_sent' | 'full_requested'
  | 'revise_resubmit' | 'offer' | 'rejected_form' | 'rejected_personal'
  | 'nudged' | 'closed_no_response' | 'withdrawn'

export interface Manuscript {
  id: number
  title: string
  genre: string | null
  category: string
  word_count: number | null
  status: ManuscriptStatus
  pitch: string | null
  notes: string | null
}

export interface Agency {
  id: number
  name: string
  website: string | null
  one_no_means_all_no: boolean
  notes: string | null
}

export interface Agent {
  id: number
  agency_id: number | null
  name: string
  email: string | null
  title: string | null
  open_to_queries: boolean
  genres: string[] | null
  mswl: string | null
  submission_method: string | null
  response_window_days: number | null
  notes: string | null
  agency?: Agency
}

export interface QueryEvent {
  id: number
  type: QueryEventType
  type_label: string
  happened_at: string | null
  notes: string | null
}

export interface Query {
  id: number
  manuscript_id: number
  agent_id: number
  status: QueryStatus
  personalization: string | null
  materials: string | null
  wave: number | null
  sent_at: string | null
  closed_at: string | null
  days_out: number | null
  manuscript?: Manuscript
  agent?: Agent
  events?: QueryEvent[]
}

export const QUERY_STATUS_LABELS: Record<QueryStatus, string> = {
  queued: 'Queued',
  sent: 'Sent',
  partial: 'Partial',
  full: 'Full',
  revise_resubmit: 'R&R',
  offer: 'Offer',
  rejected: 'Rejected',
  no_response: 'No response',
  withdrawn: 'Withdrawn',
}

export const EVENT_TYPE_LABELS: Record<QueryEventType, string> = {
  sent: 'Query sent',
  partial_requested: 'Partial requested',
  materials_sent: 'Materials sent',
  full_requested: 'Full requested',
  revise_resubmit: 'Revise & resubmit',
  offer: 'Offer of representation',
  rejected_form: 'Rejection (form)',
  rejected_personal: 'Rejection (personalized)',
  nudged: 'Nudge sent',
  closed_no_response: 'Closed — no response',
  withdrawn: 'Withdrawn',
}

export const MANUSCRIPT_CATEGORY_LABELS: Record<string, string> = {
  adult: 'Adult',
  young_adult: 'Young Adult',
  middle_grade: 'Middle Grade',
}

export const SUBMISSION_METHOD_LABELS: Record<string, string> = {
  query_manager: 'QueryManager',
  email: 'Email',
  form: 'Website form',
  other: 'Other',
}

export const MANUSCRIPT_STATUS_LABELS: Record<ManuscriptStatus, string> = {
  drafting: 'Drafting',
  querying: 'Querying',
  production: 'In production',
  published: 'Published',
  shelved: 'Shelved',
}

export interface Wrapped<T> {
  data: T
}

export interface QueryStoreResponse {
  data: Query
  meta: { warnings: string[] }
}

export interface EventStoreResponse {
  event: QueryEvent
  query: { data: Query }
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  }).format(new Date(iso))
}
