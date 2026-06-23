/**
 * Backfill dcs.editionTiers[] (seriesTierKey rows) on DCS artworks that belong to a
 * series with embedded edition tiers but have no per-artwork tier rows yet.
 *
 * Usage: npx tsx src/scripts/backfill-artwork-series-edition-tiers.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

import { getPayload } from 'payload'
import config from '@/payload.config'

import {
  buildAutopopulatedSeriesEditionTiers,
  getSeriesEditionTierAutopopulateTarget,
} from '@/lib/artwork/seriesEditionTierAutopopulate'
import { seriesEditionTierKeys } from '@/lib/artwork/seriesEditionTiers'
import { resolveArtworkSeriesSlug } from '@/lib/artOfficial/catalogScope'

async function main() {
  const payload = await getPayload({ config })

  let page = 1
  let updated = 0
  let hasNextPage = true

  while (hasNextPage) {
    const result = await payload.find({
      collection: 'artworks',
      limit: 50,
      page,
      depth: 1,
      overrideAccess: true,
    })

    for (const doc of result.docs) {
      const seriesSlug = resolveArtworkSeriesSlug(doc, undefined)
      const target = getSeriesEditionTierAutopopulateTarget(seriesSlug)
      if (!target) continue

      const series = doc.series
      if (!series || typeof series !== 'object') continue

      const tierKeys = seriesEditionTierKeys(series)
      if (tierKeys.length === 0) continue

      const existing = doc.dcs?.editionTiers
      if (Array.isArray(existing) && existing.length > 0) continue

      await payload.update({
        collection: 'artworks',
        id: doc.id,
        data: {
          hasEditions: doc.hasEditions === 'none' || !doc.hasEditions ? 'limited' : doc.hasEditions,
          dcs: {
            ...(doc.dcs ?? {}),
            editionTiers: buildAutopopulatedSeriesEditionTiers(tierKeys),
          },
        },
        overrideAccess: true,
        context: { skipSeriesEditionTierAutopopulate: true, skipEmbedding: true },
      })

      updated += 1
      console.log(`Backfilled edition tiers on ${doc.slug ?? doc.id}`)
    }

    hasNextPage = result.hasNextPage
    page += 1
  }

  console.log(`Done. Updated ${updated} artwork(s).`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
