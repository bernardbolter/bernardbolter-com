import { getPayload } from 'payload'
import config from '@payload-config'
import type { Artist } from '@/payload-types'

const defaultLocale = 'en' as const

/** Artist record with contact page fields for /contact. */
export async function getArtistForContactPage(): Promise<Artist | null> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'artists',
    locale: defaultLocale,
    limit: 1,
    depth: 0,
    sort: 'id',
    overrideAccess: false,
  })
  return result.docs[0] ?? null
}
