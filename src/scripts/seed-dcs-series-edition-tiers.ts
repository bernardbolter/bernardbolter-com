/**
 * Idempotent seed for Digital City Series edition tiers on the Series record.
 *
 * Usage: npx tsx src/scripts/seed-dcs-series-edition-tiers.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

import { getPayload } from 'payload'
import config from '@/payload.config'

const DCS_SERIES_SLUG = 'digital-city-series'

const TIER_DEFS = [
  {
    tierKey: 'monumental',
    tierName: 'Monumental Edition',
    tierOrder: 1,
    isOriginalTier: true,
    editionSize: 3,
    apCount: 1,
    dimensionUnit: 'cm' as const,
    widthWhole: 121,
    heightWhole: 121,
    substrate: 'aluminum-mount' as const,
    printTechnique: 'pigment-print' as const,
  },
  {
    tierKey: 'collectors-print',
    tierName: 'Collectors print',
    tierOrder: 2,
    isOriginalTier: false,
    editionSize: 6,
    apCount: 2,
    dimensionUnit: 'cm' as const,
    widthWhole: 80,
    heightWhole: 120,
    substrate: 'aluminum-mount' as const,
    printTechnique: 'pigment-print' as const,
  },
  {
    tierKey: 'small-print',
    tierName: 'Small print',
    tierOrder: 3,
    isOriginalTier: false,
    editionSize: 200,
    apCount: 0,
    dimensionUnit: 'cm' as const,
    widthWhole: 40,
    heightWhole: 60,
    substrate: 'paper' as const,
    printTechnique: 'pigment-print' as const,
  },
] as const

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
    throw new Error(`Series "${DCS_SERIES_SLUG}" not found.`)
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
