import type { CollectionBeforeChangeHook } from 'payload'

import { getSiteBaseUrl } from '@/lib/jsonld/site'

export const artistBeforeChange: CollectionBeforeChangeHook = ({ data }) => {
  const d = data as Record<string, unknown>
  if (!d.canonicalDomain || (typeof d.canonicalDomain === 'string' && !d.canonicalDomain.trim())) {
    d.canonicalDomain = getSiteBaseUrl()
  }
  return data
}
