import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Payload } from 'payload'

import type { EditionTierLabelMaps } from '@/lib/artwork/editionTierDisplay'
import { buildEditionVocabularyLabelMap } from '@/lib/artwork/editionTierVocabulary'

export async function getEditionTierLabelMaps(payload: Payload): Promise<EditionTierLabelMaps> {
  const [substrates, printTechniques] = await Promise.all([
    buildEditionVocabularyLabelMap(payload, 'substrate'),
    buildEditionVocabularyLabelMap(payload, 'printTechnique'),
  ])

  return { substrates, printTechniques }
}

/** Cached edition vocabulary labels for public artwork HTML. */
export async function getCachedEditionTierLabelMaps(): Promise<EditionTierLabelMaps> {
  if (process.env.NODE_ENV === 'development') {
    const payload = await getPayload({ config })
    return getEditionTierLabelMaps(payload)
  }
  return unstable_cache(
    async () => {
      const payload = await getPayload({ config })
      return getEditionTierLabelMaps(payload)
    },
    ['edition-tier-label-maps'],
    { revalidate: 3600, tags: ['artworks'] },
  )()
}
