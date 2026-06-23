import type { CollectionBeforeChangeHook } from 'payload'

import { slugifySeriesTierKey } from '@/lib/artwork/seriesEditionTiers'

export const seriesBeforeChange: CollectionBeforeChangeHook = ({ data }) => {
  const tiers = data.editionTiers
  if (!Array.isArray(tiers)) return data

  const seen = new Set<string>()

  for (let index = 0; index < tiers.length; index += 1) {
    const row = tiers[index]
    if (!row || typeof row !== 'object') continue

    const tier = row as Record<string, unknown>
    const tierName = typeof tier.tierName === 'string' ? tier.tierName.trim() : ''
    let tierKey = typeof tier.tierKey === 'string' ? tier.tierKey.trim() : ''

    if (!tierKey && tierName) {
      tierKey = slugifySeriesTierKey(tierName)
      tier.tierKey = tierKey
    }

    if (!tierKey) {
      throw new Error(`Edition tier ${index + 1}: tierKey is required (or provide tierName to auto-generate).`)
    }

    if (seen.has(tierKey)) {
      throw new Error(`Edition tier ${index + 1}: duplicate tierKey "${tierKey}" within this series.`)
    }

    seen.add(tierKey)
  }

  return data
}
