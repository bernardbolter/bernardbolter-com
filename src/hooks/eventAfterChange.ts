import type { CollectionAfterChangeHook } from 'payload'
import { revalidatePath } from 'next/cache'

import type { Event } from '@/payload-types'

export const eventAfterChange: CollectionAfterChangeHook<Event> = ({ doc }) => {
  if (typeof doc.slug === 'string' && doc.slug) {
    revalidatePath(`/events/${doc.slug}`)
  }
  revalidatePath('/cv')
  return doc
}
