import type { CollectionBeforeChangeHook } from 'payload'

import {
  mergeLocationRows,
  validateContactLocations,
} from '@/lib/artist/validateContactLocations'
import { getSiteBaseUrl } from '@/lib/jsonld/site'

export const artistBeforeChange: CollectionBeforeChangeHook = ({ data, originalDoc, operation }) => {
  const d = data as Record<string, unknown>
  if (!d.canonicalDomain || (typeof d.canonicalDomain === 'string' && !d.canonicalDomain.trim())) {
    d.canonicalDomain = getSiteBaseUrl()
  }

  if (operation === 'create' || operation === 'update') {
    const locations = mergeLocationRows(d.locations, originalDoc?.locations)
    validateContactLocations(locations)
  }

  return data
}
