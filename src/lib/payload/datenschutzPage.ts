import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'
import config from '@payload-config'

import { withDbRetry } from '@/lib/payload/withDbRetry'
import type { Artist } from '@/payload-types'

export type DatenschutzPageData = {
  de: unknown
  en: unknown
  impressum: Artist['impressum']
}

const DATENSCHUTZ_ARTIST_SELECT = {
  datenschutzFull: true,
  impressum: true,
} as const

async function fetchDatenschutzPageData(): Promise<DatenschutzPageData> {
  return withDbRetry(async () => {
    const payload = await getPayload({ config })

    const idResult = await payload.find({
      collection: 'artists',
      limit: 1,
      depth: 0,
      overrideAccess: false,
    })

    const artistId = idResult.docs[0]?.id
    if (typeof artistId !== 'number') {
      return { de: null, en: null, impressum: undefined }
    }

    const deDoc = await payload.findByID({
      collection: 'artists',
      id: artistId,
      locale: 'de',
      depth: 0,
      select: DATENSCHUTZ_ARTIST_SELECT,
      overrideAccess: false,
    })

    const enDoc = await payload.findByID({
      collection: 'artists',
      id: artistId,
      locale: 'en',
      depth: 0,
      select: DATENSCHUTZ_ARTIST_SELECT,
      overrideAccess: false,
    })

    return {
      de: deDoc.datenschutzFull ?? null,
      en: enDoc.datenschutzFull ?? null,
      impressum: enDoc.impressum ?? deDoc.impressum,
    }
  })
}

const getCachedDatenschutzPageData = unstable_cache(
  fetchDatenschutzPageData,
  ['artist-datenschutz-page'],
  {
    revalidate: 3600,
    tags: ['artists'],
  },
)

/** Localized Datenschutz rich text and Impressum for /datenschutz. */
export async function getDatenschutzPageData(): Promise<DatenschutzPageData> {
  if (process.env.NODE_ENV === 'development') {
    return fetchDatenschutzPageData()
  }
  return getCachedDatenschutzPageData()
}

/** @deprecated Use getDatenschutzPageData */
export async function getDatenschutzContent(): Promise<Pick<DatenschutzPageData, 'de' | 'en'>> {
  const data = await getDatenschutzPageData()
  return { de: data.de, en: data.en }
}
