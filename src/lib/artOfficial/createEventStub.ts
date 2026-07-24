import type { Payload } from 'payload'

import type { User } from '@/payload-types'

import { buildEventSlug } from '@/lib/artOfficial/eventSlug'
import {
  EVENT_TYPE_OPTIONS,
  type EventTypeValue,
} from '@/lib/artOfficial/eventTypeOptions'

export type CreateEventStubInput = {
  eventType: EventTypeValue
  title: string
  yearStart: number
  venueName?: string | null
  venueCity?: string | null
  venueCountry?: string | null
  eventTypeCustom?: string | null
}

export type CreateEventStubResult = {
  id: number
  slug: string
  title: string
}

const EVENT_TYPE_SET = new Set<string>(EVENT_TYPE_OPTIONS.map((o) => o.value))

/**
 * Quick Event Intake shape — enrichmentStatus: stub, hasPage: false.
 * Shared by the admin Quick Event route and create_event_stub tool.
 */
export async function createEventStub(
  payload: Payload,
  user: User,
  input: CreateEventStubInput,
): Promise<CreateEventStubResult> {
  const eventType = input.eventType
  if (!EVENT_TYPE_SET.has(eventType)) {
    throw new Error(`Invalid eventType: ${eventType}`)
  }
  if (eventType === 'other' && !input.eventTypeCustom?.trim()) {
    throw new Error('eventTypeCustom is required when eventType is other.')
  }

  const title = input.title.trim()
  if (!title) throw new Error('title is required.')
  if (!Number.isInteger(input.yearStart) || input.yearStart < 1000 || input.yearStart > 9999) {
    throw new Error('yearStart must be a 4-digit year.')
  }

  const venueCity = input.venueCity?.trim() || undefined
  const slug = buildEventSlug(title, input.yearStart, venueCity)
  const startDate = `${input.yearStart}-01-01`

  const created = await payload.create({
    collection: 'events',
    data: {
      title,
      slug,
      eventType,
      startDate,
      yearStart: input.yearStart,
      status: 'published',
      enrichmentStatus: 'stub',
      hasPage: false,
      venueName: input.venueName?.trim() || undefined,
      venueCity,
      venueCountry: input.venueCountry?.trim() || undefined,
      eventTypeCustom: input.eventTypeCustom?.trim() || undefined,
    } as never,
    overrideAccess: false,
    user,
    locale: 'en',
    context: { skipEventEnrichmentSync: true },
  })

  return {
    id: created.id,
    slug: created.slug,
    title: created.title,
  }
}

/**
 * Append artwork to Events.artworks (authority side of the join).
 * Artworks.events is a read-only join — do not write it.
 */
export async function linkArtworkToEvent(
  payload: Payload,
  user: User,
  options: { eventSlug: string; artworkId: number },
): Promise<{
  eventId: number
  eventSlug: string
  artworkId: number
  alreadyLinked: boolean
}> {
  const slug = options.eventSlug.trim()
  if (!slug) throw new Error('eventSlug is required.')

  const found = await payload.find({
    collection: 'events',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user,
    select: {
      slug: true,
      artworks: true,
    },
  })
  const event = found.docs[0]
  if (!event) throw new Error(`No event found with slug "${slug}".`)

  const existingIds = (event.artworks ?? [])
    .map((entry) => {
      if (typeof entry === 'number') return entry
      if (entry && typeof entry === 'object' && 'id' in entry) return entry.id
      return null
    })
    .filter((id): id is number => typeof id === 'number')

  if (existingIds.includes(options.artworkId)) {
    return {
      eventId: event.id,
      eventSlug: event.slug,
      artworkId: options.artworkId,
      alreadyLinked: true,
    }
  }

  await payload.update({
    collection: 'events',
    id: event.id,
    data: {
      artworks: [...existingIds, options.artworkId],
    },
    overrideAccess: false,
    user,
    context: { skipEventEnrichmentSync: true },
  })

  return {
    eventId: event.id,
    eventSlug: event.slug,
    artworkId: options.artworkId,
    alreadyLinked: false,
  }
}
