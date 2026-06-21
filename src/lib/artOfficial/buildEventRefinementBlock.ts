import type { Payload } from 'payload'

import { lexicalToPlain } from '@/lib/artOfficial/lexicalToPlain'
import { countMissingPageFields } from '@/lib/artOfficial/eventEnrichment'
import type { User } from '@/payload-types'

export async function buildEventRefinementBlock(args: {
  payload: Payload
  user: User
  eventId: number
}): Promise<string> {
  const event = await args.payload.findByID({
    collection: 'events',
    id: args.eventId,
    depth: 0,
    overrideAccess: false,
    user: args.user,
  })

  const missing = countMissingPageFields(event)
  const lines = [
    'LINKED EVENT RECORD (refinement — build on these facts, do not re-ask unless unclear):',
    `title: ${event.title}`,
    `eventType: ${event.eventType}`,
    `yearStart: ${event.yearStart ?? ''}`,
    `startDate: ${event.startDate ?? ''}`,
    `venueName: ${event.venueName ?? ''}`,
    `venueCity: ${event.venueCity ?? ''}`,
    `venueCountry: ${event.venueCountry ?? ''}`,
    `descriptionLong: ${lexicalToPlain(event.descriptionLong).slice(0, 500) || '(empty)'}`,
    `artistNote: ${event.artistNote ?? '(empty)'}`,
    `practiceArcNote: ${event.practiceArcNote ?? '(empty)'}`,
    `conceptualKeywords count: ${event.conceptualKeywords?.length ?? 0}`,
    `movementTags count: ${event.movementTags?.length ?? 0}`,
    `sameAs count: ${event.sameAs?.length ?? 0}`,
    `installationImages count: ${event.installationImages?.length ?? 0}`,
    `venueAddress: ${event.venueAddress ?? '(empty)'}`,
    `venueLatLng: ${event.venueLatLng?.lat != null ? `${event.venueLatLng.lat}, ${event.venueLatLng.lng}` : '(empty)'}`,
    `Missing page fields (of 6 tracked): ${missing}`,
  ]

  return lines.join('\n')
}
