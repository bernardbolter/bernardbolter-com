/**
 * Migrate edition tier specs from series-edition-tiers collection → series.editionTiers[],
 * and remap artwork dcs.editionTiers[] / megacities.print.editions[] to seriesTierKey.
 *
 * Usage: npx tsx src/scripts/migrate-series-edition-tiers-to-series.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

import { getPayload } from 'payload'
import config from '@/payload.config'

import { slugifySeriesTierKey } from '@/lib/artwork/seriesEditionTiers'

const DCS_TIER_NAME_TO_KEY: Record<string, string> = {
  monumental: 'monumental',
  'collectors-print': 'collectors-print',
  'small-print': 'small-print',
  'oil-painting': 'oil-painting',
}

const MEGACITIES_TIER_TO_KEY: Record<string, string> = {
  full_size: 'full-size',
  a0: 'a0',
  a1: 'a1',
}

const SERIES_TIER_NAME_TO_KEY: Record<string, string> = {
  'Monumental Edition': 'monumental',
  'Collectors print': 'collectors-print',
  'Small print': 'small-print',
  'Full size': 'full-size',
  A0: 'a0',
  A1: 'a1',
}

type LegacyTierDoc = {
  id: number
  series: number | { id: number }
  tierName: string
  tierOrder: number
  isOriginalTier?: boolean | null
  editionSize: number
  apCount?: number | null
  widthCm?: number | null
  heightCm?: number | null
  substrate?: string | null
  printTechnique?: string | null
  vendureProductId?: string | null
  notes?: string | null
}

function readSeriesId(value: unknown): number | null {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === 'number' ? id : null
  }
  return null
}

const FALLBACK_SERIES_TIERS: Record<string, Array<Record<string, unknown>>> = {
  'digital-city-series': [
    {
      tierKey: 'monumental',
      tierName: 'Monumental Edition',
      tierOrder: 1,
      isOriginalTier: true,
      editionSize: 3,
      apCount: 1,
      substrate: 'Aluminum mount',
    },
    {
      tierKey: 'collectors-print',
      tierName: 'Collectors print',
      tierOrder: 2,
      isOriginalTier: false,
      editionSize: 6,
      apCount: 2,
      substrate: 'Aluminum mount',
    },
    {
      tierKey: 'small-print',
      tierName: 'Small print',
      tierOrder: 3,
      isOriginalTier: false,
      editionSize: 200,
      apCount: 0,
      substrate: 'Paper',
    },
  ],
  megacities: [
    {
      tierKey: 'full-size',
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
      tierKey: 'a0',
      tierName: 'A0',
      tierOrder: 2,
      isOriginalTier: false,
      editionSize: 200,
      apCount: 0,
      substrate: 'Paper',
    },
    {
      tierKey: 'a1',
      tierName: 'A1',
      tierOrder: 3,
      isOriginalTier: false,
      editionSize: 500,
      apCount: 0,
      substrate: 'Paper',
    },
  ],
}

async function ensureFallbackSeriesTiers(payload: Awaited<ReturnType<typeof getPayload>>) {
  for (const [slug, defs] of Object.entries(FALLBACK_SERIES_TIERS)) {
    const seriesResult = await payload.find({
      collection: 'series',
      where: { slug: { equals: slug } },
      limit: 1,
      overrideAccess: true,
    })
    const series = seriesResult.docs[0]
    if (!series) continue
    if (Array.isArray(series.editionTiers) && series.editionTiers.length > 0) continue

    await payload.update({
      collection: 'series',
      id: series.id,
      data: { editionTiers: defs },
      overrideAccess: true,
    })
    console.log(`✓ Seeded ${defs.length} fallback edition tier(s) on series "${slug}"`)
  }
}

function tierKeyForLegacyDoc(doc: LegacyTierDoc): string {
  return SERIES_TIER_NAME_TO_KEY[doc.tierName] ?? slugifySeriesTierKey(doc.tierName)
}

async function main() {
  const payload = await getPayload({ config })

  let legacyTiers: LegacyTierDoc[] = []
  try {
    const legacyResult = await payload.find({
      collection: 'series-edition-tiers' as 'series',
      limit: 100,
      sort: 'tierOrder',
      overrideAccess: true,
    })
    legacyTiers = legacyResult.docs as unknown as LegacyTierDoc[]
  } catch {
    console.log('No series-edition-tiers collection (already removed) — skipping legacy import.')
  }

  const idToTierKey = new Map<number, string>()

  if (legacyTiers.length > 0) {
    const bySeriesId = new Map<number, LegacyTierDoc[]>()
    for (const doc of legacyTiers) {
      const seriesId = readSeriesId(doc.series)
      if (seriesId == null) continue
      const list = bySeriesId.get(seriesId) ?? []
      list.push(doc)
      bySeriesId.set(seriesId, list)
    }

    for (const [seriesId, tiers] of bySeriesId) {
      const series = await payload.findByID({
        collection: 'series',
        id: seriesId,
        depth: 0,
        overrideAccess: true,
      })

      const existing = Array.isArray(series.editionTiers) ? series.editionTiers : []
      const existingKeys = new Set(
        existing.map((row) => (typeof row?.tierKey === 'string' ? row.tierKey : '')),
      )

      const merged = [...existing]

      for (const doc of tiers.sort((a, b) => (a.tierOrder ?? 0) - (b.tierOrder ?? 0))) {
        const tierKey = tierKeyForLegacyDoc(doc)
        idToTierKey.set(doc.id, tierKey)

        if (existingKeys.has(tierKey)) {
          console.log(`  Series ${series.slug}: tier "${tierKey}" already embedded — skip`)
          continue
        }

        merged.push({
          tierKey,
          tierName: doc.tierName,
          tierOrder: doc.tierOrder,
          isOriginalTier: doc.isOriginalTier ?? false,
          editionSize: doc.editionSize,
          apCount: doc.apCount ?? 0,
          widthCm: doc.widthCm ?? undefined,
          heightCm: doc.heightCm ?? undefined,
          substrate: doc.substrate ?? undefined,
          printTechnique: doc.printTechnique ?? undefined,
          vendureProductId: doc.vendureProductId ?? undefined,
          notes: doc.notes ?? undefined,
        })
        existingKeys.add(tierKey)
      }

      await payload.update({
        collection: 'series',
        id: seriesId,
        data: { editionTiers: merged },
        overrideAccess: true,
      })
      console.log(`✓ Embedded ${merged.length} edition tier(s) on series "${series.slug}"`)
    }
  }

  await ensureFallbackSeriesTiers(payload)

  const artworks = await payload.find({
    collection: 'artworks',
    limit: 500,
    depth: 0,
    overrideAccess: true,
  })

  let updatedArtworks = 0

  for (const artwork of artworks.docs) {
    let changed = false
    const data: Record<string, unknown> = {}

    const dcsTiers = artwork.dcs?.editionTiers
    if (Array.isArray(dcsTiers) && dcsTiers.length > 0) {
      const nextDcsTiers = dcsTiers.map((tier) => {
        const legacyId =
          typeof tier.seriesEditionTier === 'number'
            ? tier.seriesEditionTier
            : typeof tier.seriesEditionTier === 'object' && tier.seriesEditionTier
              ? tier.seriesEditionTier.id
              : null

        const tierKey =
          (typeof tier.seriesTierKey === 'string' && tier.seriesTierKey.trim()) ||
          (legacyId != null ? idToTierKey.get(legacyId) : undefined) ||
          (tier.tierName ? DCS_TIER_NAME_TO_KEY[tier.tierName] : undefined)

        if (!tierKey) return tier

        if (tier.seriesTierKey === tierKey && !tier.seriesEditionTier) return tier

        changed = true
        const { seriesEditionTier: _removed, ...rest } = tier as Record<string, unknown>
        return { ...rest, seriesTierKey: tierKey }
      })

      if (changed) {
        data.dcs = { ...artwork.dcs, editionTiers: nextDcsTiers }
      }
    }

    const megacitiesEditions = artwork.megacities?.print?.editions
    if (Array.isArray(megacitiesEditions) && megacitiesEditions.length > 0) {
      let megacitiesChanged = false
      const nextEditions = megacitiesEditions.map((tier) => {
        const legacyId =
          typeof tier.seriesEditionTier === 'number'
            ? tier.seriesEditionTier
            : typeof tier.seriesEditionTier === 'object' && tier.seriesEditionTier
              ? tier.seriesEditionTier.id
              : null

        const tierKey =
          (typeof tier.seriesTierKey === 'string' && tier.seriesTierKey.trim()) ||
          (legacyId != null ? idToTierKey.get(legacyId) : undefined) ||
          (tier.tier ? MEGACITIES_TIER_TO_KEY[tier.tier] : undefined)

        if (!tierKey) return tier

        if (tier.seriesTierKey === tierKey && !tier.seriesEditionTier) return tier

        megacitiesChanged = true
        const { seriesEditionTier: _removed, ...rest } = tier as Record<string, unknown>
        return { ...rest, seriesTierKey: tierKey }
      })

      if (megacitiesChanged) {
        changed = true
        data.megacities = {
          ...artwork.megacities,
          print: {
            ...artwork.megacities?.print,
            editions: nextEditions,
          },
        }
      }
    }

    if (changed) {
      await payload.update({
        collection: 'artworks',
        id: artwork.id,
        data,
        overrideAccess: true,
        context: { skipEmbedding: true, skipSeriesEditionTierAutopopulate: true },
      })
      updatedArtworks += 1
      console.log(`✓ Updated artwork "${artwork.slug}" edition tier keys`)
    }
  }

  console.log(`\nDone. Updated ${updatedArtworks} artwork(s).`)
  console.log(
    'If series-edition-tiers table still exists in Postgres, drop it after confirming the app boots cleanly.',
  )
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
