import type { CollectionAfterChangeHook } from 'payload'

import { revalidateArchive } from '@/lib/cache/revalidateArchive'
import type { Event } from '@/payload-types'

export const eventAfterChange: CollectionAfterChangeHook<Event> = ({ doc }) => {
  const paths = ['/cv']
  if (typeof doc.slug === 'string' && doc.slug) {
    paths.push(`/events/${doc.slug}`)
  }
  revalidateArchive({ paths })
  return doc
}
