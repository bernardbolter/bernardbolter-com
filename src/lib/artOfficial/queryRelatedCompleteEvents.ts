import type { Payload } from 'payload'

import type { Event, User } from '@/payload-types'

const CAP = 5

function readArtworkSeriesSlug(artwork: number | { series?: unknown } | null | undefined): string | null {
  if (!artwork || typeof artwork !== 'object') return null
  const series = artwork.series
  if (!series || typeof series !== 'object' || !('slug' in series)) return null
  return typeof series.slug === 'string' ? series.slug : null
}

function scoreEvent(
  candidate: Event,
  target: Event,
  targetSeriesSlugs: Set<string>,
): number {
  let score = 0
  if (
    target.venueName &&
    candidate.venueName &&
    target.venueName.trim().toLowerCase() === candidate.venueName.trim().toLowerCase()
  ) {
    score += 100
  }
  if (target.yearStart && candidate.yearStart === target.yearStart) score += 50

  const candidateArtworks = candidate.artworks ?? []
  for (const entry of candidateArtworks) {
    const slug = readArtworkSeriesSlug(entry)
    if (slug && targetSeriesSlugs.has(slug)) {
      score += 30
      break
    }
  }

  if (candidate.yearStart) score += candidate.yearStart / 10000
  return score
}

/** Prioritise venue → year → shared series artwork → recency. Capped at 5. */
export async function queryRelatedCompleteEvents(args: {
  payload: Payload
  user: User
  eventId: number
}): Promise<Event[]> {
  const target = await args.payload.findByID({
    collection: 'events',
    id: args.eventId,
    depth: 2,
    overrideAccess: false,
    user: args.user,
  })

  const complete = await args.payload.find({
    collection: 'events',
    where: {
      and: [
        { enrichmentStatus: { equals: 'complete' } },
        { id: { not_equals: args.eventId } },
      ],
    },
    limit: 100,
    depth: 2,
    sort: '-yearStart',
    overrideAccess: false,
    user: args.user,
  })

  const targetSeriesSlugs = new Set<string>()
  for (const entry of target.artworks ?? []) {
    const slug = readArtworkSeriesSlug(entry)
    if (slug) targetSeriesSlugs.add(slug)
  }

  return [...complete.docs]
    .map((doc) => ({ doc, score: scoreEvent(doc, target, targetSeriesSlugs) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, CAP)
    .map(({ doc }) => doc)
}
