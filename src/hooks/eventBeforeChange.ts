import { randomUUID } from 'crypto'

import type { CollectionBeforeChangeHook } from 'payload'
import { APIError } from 'payload'

import {
  canMarkEventComplete,
  deriveEnrichmentStatus,
} from '@/lib/artOfficial/eventEnrichment'
import { buildEventSlug } from '@/lib/artOfficial/eventSlug'
import type { Event } from '@/payload-types'

function syncJsonLdSameAs(d: Record<string, unknown>): void {
  const sameAs = d.sameAs
  if (!Array.isArray(sameAs)) return
  const uris = sameAs
    .map((row) => {
      if (!row || typeof row !== 'object') return null
      const uri = (row as { uri?: string }).uri?.trim()
      return uri ? { uri } : null
    })
    .filter(Boolean)
  if (uris.length) {
    d.jsonldSameAs = uris
  }
}

export const eventBeforeChange: CollectionBeforeChangeHook<Event> = ({
  data,
  operation,
  context,
}) => {
  const d = data as Record<string, unknown>

  if (operation === 'create' && !d.eventId) {
    d.eventId = randomUUID()
  }

  const start = d.startDate as string | undefined
  if (start) {
    d.yearStart = new Date(start).getFullYear()
  }

  const title = typeof d.title === 'string' ? d.title.trim() : ''
  const year =
    typeof d.yearStart === 'number' && !Number.isNaN(d.yearStart) ?
      d.yearStart
    : start ?
      new Date(start).getFullYear()
    : null
  const slug = typeof d.slug === 'string' ? d.slug.trim() : ''
  if (!slug && title && year) {
    d.slug = buildEventSlug(title, year)
  }

  syncJsonLdSameAs(d)

  if (context?.skipEventEnrichmentSync) {
    return data
  }

  const merged = d as unknown as Event
  const derived = deriveEnrichmentStatus(merged)
  d.enrichmentStatus = derived
  d.hasPage = derived === 'complete'

  if (derived === 'complete') {
    const check = canMarkEventComplete(merged)
    if (!check.ok) {
      throw new APIError(
        `Cannot mark event complete — missing: ${check.errors.join(', ')}`,
        400,
      )
    }
  }

  return data
}
