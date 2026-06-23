import type { Payload } from 'payload'

import type { EditionTierLabelMaps } from '@/lib/artwork/editionTierDisplay'

import { buildEditionVocabularyLabelMap } from '@/lib/artwork/editionTierVocabulary'
import type { EditionTierLabelMaps } from '@/lib/artwork/editionTierDisplay'

export async function getEditionTierLabelMaps(payload: Payload): Promise<EditionTierLabelMaps> {
  const [substrates, printTechniques] = await Promise.all([
    buildEditionVocabularyLabelMap(payload, 'substrate'),
    buildEditionVocabularyLabelMap(payload, 'printTechnique'),
  ])

  return { substrates, printTechniques }
}
