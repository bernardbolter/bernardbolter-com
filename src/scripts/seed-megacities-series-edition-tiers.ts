/**
 * Idempotent seed for Megacities SeriesEditionTiers (v2 architecture).
 *
 * Usage: npx tsx src/scripts/seed-megacities-series-edition-tiers.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

import { getPayload } from 'payload'
import config from '@/payload.config'

const MEGACITIES_SERIES_SLUG = 'megacities'

const TIER_DEFS = [
  {
    tierName: 'Full size',
    tierOrder: 1,
    isOriginalTier: true,
    editionSize: 3,
    apCount: 1,
    widthCm: 150,
    heightCm: 200,
    substrate: 'Aluminum mount',
  },
  {
    tierName: 'A0',
    tierOrder: 2,
    isOriginalTier: false,
    editionSize: 200,
    apCount: 0,
    substrate: 'Paper',
  },
  {
    tierName: 'A1',
    tierOrder: 3,
    isOriginalTier: false,
    editionSize: 500,
    apCount: 0,
    substrate: 'Paper',
  },
] as const

async function main() {
  const payload = await getPayload({ config })

  const seriesResult = await payload.find({
    collection: 'series',
    where: { slug: { equals: MEGACITIES_SERIES_SLUG } },
    limit: 1,
    overrideAccess: true,
  })
  const series = seriesResult.docs[0]
  if (!series) {
    throw new Error(`Series "${MEGACITIES_SERIES_SLUG}" not found. Run seed-series.ts first.`)
  }

  const existing = await payload.find({
    collection: 'series-edition-tiers',
    where: { series: { equals: series.id } },
    limit: 20,
    sort: 'tierOrder',
    overrideAccess: true,
  })

  for (const def of TIER_DEFS) {
    const match = existing.docs.find((row) => row.tierName === def.tierName)
    if (match) {
      await payload.update({
        collection: 'series-edition-tiers',
        id: match.id,
        data: { ...def, series: series.id },
        overrideAccess: true,
      })
      console.log(`Updated SeriesEditionTier "${def.tierName}" (id ${match.id})`)
      continue
    }

    const created = await payload.create({
      collection: 'series-edition-tiers',
      data: { ...def, series: series.id },
      overrideAccess: true,
    })
    console.log(`Created SeriesEditionTier "${def.tierName}" (id ${created.id})`)
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
