import type { Session } from '@/payload-types'

export type TimelineEntry = {
  targetCollection?: string
  field?: string
  value?: unknown
  confidence?: string
  source?: string
  timestamp?: string
}

export type EventAuthorityProposal = {
  fieldName: string
  value: string
  sourceUrl?: string
  confidence?: string
}

export type ArtOfficialSession = Session
