import { lexicalToPlain } from '@/lib/artOfficial/lexicalToPlain'
import type { Event } from '@/payload-types'

export type EnrichmentStatus = 'stub' | 'partial' | 'complete'

const VENUE_EVENT_TYPES = new Set([
  'solo-exhibition',
  'group-exhibition',
  'art-fair',
  'talk-panel',
  'performance',
  'screening',
  'residency',
  'public-commission',
])

const SAME_AS_EXEMPT_TYPES = new Set(['education', 'award', 'bibliography', 'publication'])

export function eventNeedsVenueAddress(eventType: string): boolean {
  return VENUE_EVENT_TYPES.has(eventType)
}

export function eventNeedsSameAs(eventType: string): boolean {
  return !SAME_AS_EXEMPT_TYPES.has(eventType)
}

export function countMissingPageFields(event: Pick<
  Event,
  | 'descriptionLong'
  | 'artistNote'
  | 'installationImages'
  | 'sameAs'
  | 'venueAddress'
  | 'venueLatLng'
  | 'eventType'
>): number {
  let missing = 0
  if (!lexicalToPlain(event.descriptionLong).trim()) missing += 1
  if (!event.artistNote?.trim()) missing += 1
  if (!event.installationImages?.length) missing += 1
  if (!event.sameAs?.length) missing += 1
  if (eventNeedsVenueAddress(event.eventType) && !event.venueAddress?.trim()) missing += 1
  if (!event.venueLatLng?.lat || !event.venueLatLng?.lng) missing += 1
  return missing
}

export function canMarkEventComplete(event: Event): { ok: boolean; errors: string[] } {
  const errors: string[] = []
  if (!lexicalToPlain(event.descriptionLong).trim()) {
    errors.push('descriptionLong')
  }
  if (eventNeedsSameAs(event.eventType) && !event.sameAs?.length) {
    errors.push('sameAs')
  }
  if (eventNeedsVenueAddress(event.eventType) && !event.venueAddress?.trim()) {
    errors.push('venueAddress')
  }
  return { ok: errors.length === 0, errors }
}

export function deriveEnrichmentStatus(event: Event): EnrichmentStatus {
  const completeCheck = canMarkEventComplete(event)
  if (completeCheck.ok) return 'complete'

  const missing = countMissingPageFields(event)
  const totalTracked = 6
  if (missing >= totalTracked - 1) return 'stub'
  return 'partial'
}
