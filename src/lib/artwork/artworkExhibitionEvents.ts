import type { Artwork, Event } from '@/payload-types'

const EXHIBITION_EVENT_TYPES = new Set<Event['eventType']>([
  'solo-exhibition',
  'group-exhibition',
  'art-fair',
  'screening',
])

export type ArtworkExhibitionEvent = {
  event: Event
  year: number
}

function eventYear(event: Event): number {
  if (typeof event.yearStart === 'number') return event.yearStart
  const parsed = new Date(event.startDate)
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getFullYear()
}

function collectEventsFromArtwork(artwork: Artwork): Event[] {
  const events: Event[] = []
  const seen = new Set<number>()

  const push = (event: number | Event | null | undefined) => {
    if (!event || typeof event !== 'object' || typeof event.id !== 'number') return
    if (seen.has(event.id)) return
    seen.add(event.id)
    events.push(event)
  }

  for (const event of artwork.events?.docs ?? []) {
    push(event)
  }

  for (const row of artwork.exhibitionHistory ?? []) {
    if (!row || typeof row !== 'object') continue
    push(row.event)
  }

  return events
}

export function getArtworkExhibitionEvents(artwork: Artwork): ArtworkExhibitionEvent[] {
  return collectEventsFromArtwork(artwork)
    .filter((event) => EXHIBITION_EVENT_TYPES.has(event.eventType))
    .map((event) => ({ event, year: eventYear(event) }))
    .sort(
      (a, b) =>
        b.year - a.year ||
        (b.event.startDate ?? '').localeCompare(a.event.startDate ?? ''),
    )
}
