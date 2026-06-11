import type { CollectionAfterChangeHook } from 'payload'
import { revalidatePath } from 'next/cache'

import type { Event } from '@/payload-types'

export const eventAfterChange: CollectionAfterChangeHook<Event> = ({ doc }) => {
  try {
    if (typeof doc.slug === 'string' && doc.slug) {
      revalidatePath(`/events/${doc.slug}`)
    }
    revalidatePath('/cv')
  } catch {
    // No Next.js static generation store (seed scripts, tests)
  }
  return doc
}
