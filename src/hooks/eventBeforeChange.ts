import { randomUUID } from 'crypto'

import type { CollectionBeforeChangeHook } from 'payload'

export const eventBeforeChange: CollectionBeforeChangeHook = ({ data, operation }) => {
  const d = data as Record<string, unknown>
  if (operation === 'create' && !d.eventId) {
    d.eventId = randomUUID()
  }
  const start = d.startDate as string | undefined
  if (start) {
    d.yearStart = new Date(start).getFullYear()
  }
  return data
}
