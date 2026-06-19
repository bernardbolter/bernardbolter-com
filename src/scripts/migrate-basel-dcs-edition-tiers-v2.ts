/**
 * Step 4 — Migrate Basel Switzerland (BB-DCS-2007-002) to v2 edition architecture.
 *
 * Confirms live admin values on basel-switzerland, aligns SeriesEditionTiers,
 * and wires seriesEditionTier relations on dcs.editionTiers[].
 *
 * Usage: npx tsx src/scripts/migrate-basel-dcs-edition-tiers-v2.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

import { getPayload } from 'payload'
import config from '@/payload.config'

const BASEL_SLUG = 'basel-switzerland'
const DCS_SERIES_SLUG = 'digital-city-series'

/** Map dcs.editionTiers[].tierName select value → series-edition-tiers.tierName */
const TIER_NAME_TO_SERIES: Record<string, string> = {
  monumental: 'Monumental Edition',
  'collectors-print': 'Collectors print',
  'small-print': 'Small print',
}

type SeriesTierDoc = {
  id: number
  tierName: string
  editionSize: number
}

async function main() {
  const payload = await getPayload({ config })

  const seriesResult = await payload.find({
    collection: 'series',
    where: { slug: { equals: DCS_SERIES_SLUG } },
    limit: 1,
    overrideAccess: true,
  })
  const series = seriesResult.docs[0]
  if (!series) {
    throw new Error(`Series "${DCS_SERIES_SLUG}" not found`)
  }

  const artworkResult = await payload.find({
    collection: 'artworks',
    where: { slug: { equals: BASEL_SLUG } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const artwork = artworkResult.docs[0]
  if (!artwork) {
    throw new Error(`Artwork "${BASEL_SLUG}" not found`)
  }

  const liveTiers = artwork.dcs?.editionTiers ?? []
  if (liveTiers.length === 0) {
    throw new Error(`Artwork "${BASEL_SLUG}" has no dcs.editionTiers[] entries`)
  }

  console.log('Live admin tier values on basel-switzerland:')
  for (const tier of liveTiers) {
    console.log(
      `  ${tier.tierName}: editionSize=${tier.totalEditionSize}, substrate=${tier.printSubstrate}, isOriginalTier=${tier.isOriginalTier}, copies=${tier.copies?.length ?? 0}`,
    )
  }

  const collectorsLive = liveTiers.find((t) => t.tierName === 'collectors-print')
  const monumentalLive = liveTiers.find((t) => t.tierName === 'monumental')
  const smallLive = liveTiers.find((t) => t.tierName === 'small-print')

  if (collectorsLive?.totalEditionSize == null) {
    throw new Error('collectors-print tier missing totalEditionSize on live artwork')
  }

  const seriesTiersResult = await payload.find({
    collection: 'series-edition-tiers',
    where: { series: { equals: series.id } },
    limit: 20,
    sort: 'tierOrder',
    overrideAccess: true,
  })

  let seriesTiers = seriesTiersResult.docs as SeriesTierDoc[]

  if (seriesTiers.length === 0) {
    throw new Error(
      'No SeriesEditionTiers for Digital City Series — create them in admin or run fixture seed first.',
    )
  }

  const collectorsSeries = seriesTiers.find((t) => t.tierName === 'Collectors print')
  if (collectorsSeries && collectorsSeries.editionSize !== collectorsLive.totalEditionSize) {
    console.log(
      `Updating SeriesEditionTiers "Collectors print" editionSize: ${collectorsSeries.editionSize} → ${collectorsLive.totalEditionSize} (live admin)`,
    )
    await payload.update({
      collection: 'series-edition-tiers',
      id: collectorsSeries.id,
      data: { editionSize: collectorsLive.totalEditionSize },
      overrideAccess: true,
    })
    seriesTiers = seriesTiers.map((t) =>
      t.id === collectorsSeries.id
        ? { ...t, editionSize: collectorsLive.totalEditionSize! }
        : t,
    )
  }

  const seriesByName = new Map(seriesTiers.map((t) => [t.tierName, t]))

  const updatedEditionTiers = liveTiers.map((tier) => {
    const tierName = tier.tierName ?? ''
    const seriesTierName = TIER_NAME_TO_SERIES[tierName]
    const seriesTier = seriesTierName ? seriesByName.get(seriesTierName) : undefined

    if (!seriesTier) {
      console.warn(`No SeriesEditionTiers match for artwork tier "${tierName}"`)
    }

    const isMonumental = tierName === 'monumental'

    return {
      ...tier,
      seriesEditionTier: seriesTier?.id ?? tier.seriesEditionTier,
      isOriginalTier: isMonumental ? true : (tier.isOriginalTier ?? false),
      vendureProductId: seriesTier ? null : tier.vendureProductId,
      copies: tier.copies ?? [],
    }
  })

  await payload.update({
    collection: 'artworks',
    id: artwork.id,
    data: {
      hasEditions: 'limited',
      dcs: {
        ...artwork.dcs,
        editionTiers: updatedEditionTiers,
      },
    },
    overrideAccess: true,
    context: { skipEmbedding: true },
  })

  console.log('\n✓ Migrated basel-switzerland:')
  console.log('  hasEditions → limited')
  for (const tier of updatedEditionTiers) {
    const seriesId =
      typeof tier.seriesEditionTier === 'object'
        ? tier.seriesEditionTier?.id
        : tier.seriesEditionTier
    console.log(
      `  ${tier.tierName}: seriesEditionTier=${seriesId}, isOriginalTier=${tier.isOriginalTier}, copies=${tier.copies?.length ?? 0}`,
    )
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
