import { randomUUID } from 'crypto'

import type { CollectionBeforeChangeHook } from 'payload'

import { computeEventCompletenessScore } from '@/lib/events/completenessScore'

export const eventBeforeChange: CollectionBeforeChangeHook = ({ data, operation }) => {
  const d = data as Record<string, unknown>
  if (operation === 'create' && !d.eventId) {
    d.eventId = randomUUID()
  }
  d.completenessScore = computeEventCompletenessScore(d)
  return data
}
