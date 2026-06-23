/**
 * Idempotent seed for Megacities edition tiers on the Series record.
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
    tierKey: 'full-size',
    tierName: 'Full size',
    tierOrder: 1,
    isOriginalTier: true,
    editionSize: 3,
    apCount: 1,
    dimensionUnit: 'cm' as const,
    widthWhole: 150,
    heightWhole: 200,
    substrate: 'aluminum-mount' as const,
    printTechnique: 'pigment-print' as const,
  },
  {
    tierKey: 'a0',
    tierName: 'A0',
    tierOrder: 2,
    isOriginalTier: false,
    editionSize: 200,
    apCount: 0,
    dimensionUnit: 'cm' as const,
    widthWhole: 84,
    heightWhole: 119,
    substrate: 'paper' as const,
    printTechnique: 'pigment-print' as const,
  },
  {
    tierKey: 'a1',
    tierName: 'A1',
    tierOrder: 3,
    isOriginalTier: false,
    editionSize: 500,
    apCount: 0,
    dimensionUnit: 'cm' as const,
    widthWhole: 59,
    heightWhole: 84,
    substrate: 'paper' as const,
    printTechnique: 'pigment-print' as const,
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

  const existing = Array.isArray(series.editionTiers) ? series.editionTiers : []
  const byKey = new Map(existing.map((row) => [row.tierKey, row]))
  const merged = [...existing]

  for (const def of TIER_DEFS) {
    const match = byKey.get(def.tierKey)
    if (match) {
      const index = merged.findIndex((row) => row.tierKey === def.tierKey)
      if (index >= 0) merged[index] = { ...match, ...def }
      console.log(`Updated series tier "${def.tierName}" (${def.tierKey})`)
      continue
    }

    merged.push({ ...def })
    console.log(`Added series tier "${def.tierName}" (${def.tierKey})`)
  }

  await payload.update({
    collection: 'series',
    id: series.id,
    data: { editionTiers: merged },
    overrideAccess: true,
  })

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
