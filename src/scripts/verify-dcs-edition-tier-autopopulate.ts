/**
 * Live verification for DCS edition tier auto-populate hook.
 *
 * Usage: npx tsx src/scripts/verify-dcs-edition-tier-autopopulate.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

import { getPayload } from 'payload'
import config from '@/payload.config'

const TEST_SLUG = '__verify-dcs-autopopulate' as const
const BASEL_SLUG = 'basel-switzerland'
const GATES_SLUG = '__fixture-gates-iii'

type TierSnapshot = {
  count: number
  rows: Array<{
    tierName?: string | null
    seriesEditionTier?: number | null
    totalEditionSize?: number | null
  }>
}

function snapshotTiers(artwork: { dcs?: { editionTiers?: unknown[] } | null }): TierSnapshot {
  const rows = (artwork.dcs?.editionTiers ?? []) as Array<{
    tierName?: string | null
    seriesEditionTier?: number | { id?: number } | null
    totalEditionSize?: number | null
  }>

  return {
    count: rows.length,
    rows: rows.map((row) => ({
      tierName: row.tierName ?? null,
      seriesEditionTier:
        typeof row.seriesEditionTier === 'number'
          ? row.seriesEditionTier
          : typeof row.seriesEditionTier === 'object' && row.seriesEditionTier
            ? (row.seriesEditionTier.id ?? null)
            : null,
      totalEditionSize: row.totalEditionSize ?? null,
    })),
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`)
}

async function cleanup(payload: Awaited<ReturnType<typeof getPayload>>) {
  const existing = await payload.find({
    collection: 'artworks',
    where: { slug: { equals: TEST_SLUG } },
    limit: 1,
    overrideAccess: true,
  })
  if (existing.docs[0]) {
    await payload.delete({
      collection: 'artworks',
      id: existing.docs[0].id,
      overrideAccess: true,
    })
  }
}

async function main() {
  const payload = await getPayload({ config })
  await cleanup(payload)

  const seriesResult = await payload.find({
    collection: 'series',
    where: { slug: { equals: 'digital-city-series' } },
    limit: 1,
    overrideAccess: true,
  })
  const dcsSeries = seriesResult.docs[0]
  assert(Boolean(dcsSeries), 'Digital City Series must exist')

  const artistResult = await payload.find({
    collection: 'artists',
    limit: 1,
    overrideAccess: true,
  })
  const artist = artistResult.docs[0]
  assert(Boolean(artist), 'At least one artist must exist')

  const expectedSeriesTierIds = (
    await payload.find({
      collection: 'series-edition-tiers',
      where: { series: { equals: dcsSeries!.id } },
      sort: 'tierOrder',
      limit: 10,
      overrideAccess: true,
    })
  ).docs.map((tier) => tier.id)

  assert(expectedSeriesTierIds.length === 3, `Expected 3 series edition tiers, got ${expectedSeriesTierIds.length}`)

  console.log('1) New DCS artwork with empty editionTiers[]')
  const created = await payload.create({
    collection: 'artworks',
    data: {
      title: 'Verify DCS Autopopulate',
      slug: TEST_SLUG,
      status: 'draft',
      creator: artist!.id,
      series: dcsSeries!.id,
      seriesSlug: 'digital-city-series',
      yearCreated: 2026,
      medium: 'photo-collage',
      measurementType: ['digital'],
      recordOrigin: 'artist-catalogued',
      dcs: {
        editionTiers: [],
      },
    },
    overrideAccess: true,
    context: { skipEmbedding: true },
  })

  const createdSnap = snapshotTiers(created)
  assert(createdSnap.count === 3, `Expected 3 auto-populated tiers, got ${createdSnap.count}`)
  assert(
    createdSnap.rows.every((row) => row.seriesEditionTier != null),
    'Each auto-populated tier must have seriesEditionTier set',
  )
  assert(
    createdSnap.rows.every(
      (row) => row.tierName == null && row.totalEditionSize == null,
    ),
    'Auto-populated tiers must not fill deprecated fallback fields',
  )
  assert(
    JSON.stringify(createdSnap.rows.map((row) => row.seriesEditionTier)) ===
      JSON.stringify(expectedSeriesTierIds),
    'Auto-populated tier ids must match series tierOrder',
  )
  console.log('   PASS — 3 tiers linked by seriesEditionTier only')

  console.log('2) Basel re-save must not duplicate or reset editionTiers[]')
  const baselBefore = await payload.find({
    collection: 'artworks',
    where: { slug: { equals: BASEL_SLUG } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const basel = baselBefore.docs[0]
  assert(Boolean(basel), `Artwork "${BASEL_SLUG}" must exist`)
  const baselSnapBefore = snapshotTiers(basel!)

  const baselAfter = await payload.update({
    collection: 'artworks',
    id: basel!.id,
    data: {
      reasoningStatus: basel!.reasoningStatus ?? 'complete',
    },
    overrideAccess: true,
    context: { skipEmbedding: true },
  })
  const baselSnapAfter = snapshotTiers(baselAfter)
  assert(
    JSON.stringify(baselSnapAfter) === JSON.stringify(baselSnapBefore),
    'Basel editionTiers changed after no-op save',
  )
  console.log('   PASS — Basel tiers unchanged')

  console.log('3) Non-DCS artwork save must not add editionTiers[]')
  const gatesBefore = await payload.find({
    collection: 'artworks',
    where: { slug: { equals: GATES_SLUG } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const gates = gatesBefore.docs[0]
  assert(Boolean(gates), `Artwork "${GATES_SLUG}" must exist`)
  const gatesSnapBefore = snapshotTiers(gates!)

  const gatesAfter = await payload.update({
    collection: 'artworks',
    id: gates!.id,
    data: {
      reasoningStatus: gates!.reasoningStatus ?? 'complete',
    },
    overrideAccess: true,
    context: { skipEmbedding: true },
  })
  const gatesSnapAfter = snapshotTiers(gatesAfter)
  assert(
    JSON.stringify(gatesSnapAfter) === JSON.stringify(gatesSnapBefore),
    'Non-DCS artwork gained editionTiers after save',
  )
  console.log('   PASS — Gates fixture unaffected')

  console.log('4) Blank manual tier row must fail validation')
  let blankTierRejected = false
  try {
    await payload.update({
      collection: 'artworks',
      id: created.id,
      data: {
        dcs: {
          editionTiers: [{}],
        },
      },
      overrideAccess: true,
      context: { skipEmbedding: true, skipDcsEditionTierAutopopulate: true },
    })
  } catch (error) {
    blankTierRejected = true
    const message = error instanceof Error ? error.message : String(error)
    console.log(`   Validation rejected blank tier: ${message.slice(0, 160)}`)
  }
  assert(blankTierRejected, 'Blank edition tier row was allowed to save')
  console.log('   PASS — blank tier rejected')

  await cleanup(payload)
  console.log('\nAll verification steps passed.')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
