/**
 * Live verification for series edition tier auto-populate hook (DCS + Megacities).
 *
 * Usage: npx tsx src/scripts/verify-series-edition-tier-autopopulate.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

import { getPayload } from 'payload'
import config from '@/payload.config'

const DCS_TEST_SLUG = '__verify-dcs-autopopulate' as const
const MEGACITIES_TEST_SLUG = '__verify-megacities-autopopulate' as const
const BASEL_SLUG = 'basel-switzerland'
const GATES_SLUG = '__fixture-gates-iii'

type TierSnapshot = {
  count: number
  rows: Array<{ seriesEditionTier?: number | null }>
}

function snapshotTiers(rows: unknown[] | null | undefined): TierSnapshot {
  const list = (rows ?? []) as Array<{
    seriesEditionTier?: number | { id?: number } | null
  }>

  return {
    count: list.length,
    rows: list.map((row) => ({
      seriesEditionTier:
        typeof row.seriesEditionTier === 'number'
          ? row.seriesEditionTier
          : typeof row.seriesEditionTier === 'object' && row.seriesEditionTier
            ? (row.seriesEditionTier.id ?? null)
            : null,
    })),
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`)
}

async function deleteBySlug(payload: Awaited<ReturnType<typeof getPayload>>, slug: string) {
  const existing = await payload.find({
    collection: 'artworks',
    where: { slug: { equals: slug } },
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

async function cleanup(payload: Awaited<ReturnType<typeof getPayload>>) {
  await deleteBySlug(payload, DCS_TEST_SLUG)
  await deleteBySlug(payload, MEGACITIES_TEST_SLUG)
}

async function getSeriesTierIds(
  payload: Awaited<ReturnType<typeof getPayload>>,
  seriesSlug: string,
): Promise<number[]> {
  const series = (
    await payload.find({
      collection: 'series',
      where: { slug: { equals: seriesSlug } },
      limit: 1,
      overrideAccess: true,
    })
  ).docs[0]
  assert(Boolean(series), `Series "${seriesSlug}" must exist`)

  return (
    await payload.find({
      collection: 'series-edition-tiers',
      where: { series: { equals: series!.id } },
      sort: 'tierOrder',
      limit: 10,
      overrideAccess: true,
    })
  ).docs.map((tier) => tier.id)
}

async function main() {
  const payload = await getPayload({ config })
  await cleanup(payload)

  const artist = (
    await payload.find({ collection: 'artists', limit: 1, overrideAccess: true })
  ).docs[0]
  assert(Boolean(artist), 'At least one artist must exist')

  const dcsSeries = (
    await payload.find({
      collection: 'series',
      where: { slug: { equals: 'digital-city-series' } },
      limit: 1,
      overrideAccess: true,
    })
  ).docs[0]!
  const megacitiesSeries = (
    await payload.find({
      collection: 'series',
      where: { slug: { equals: 'megacities' } },
      limit: 1,
      overrideAccess: true,
    })
  ).docs[0]!

  const dcsTierIds = await getSeriesTierIds(payload, 'digital-city-series')
  const megacitiesTierIds = await getSeriesTierIds(payload, 'megacities')
  assert(dcsTierIds.length === 3, `Expected 3 DCS series tiers, got ${dcsTierIds.length}`)
  assert(
    megacitiesTierIds.length === 3,
    `Expected 3 Megacities series tiers, got ${megacitiesTierIds.length}`,
  )

  console.log('1) New DCS artwork with empty editionTiers[]')
  const dcsCreated = await payload.create({
    collection: 'artworks',
    data: {
      title: 'Verify DCS Autopopulate',
      slug: DCS_TEST_SLUG,
      status: 'draft',
      creator: artist!.id,
      series: dcsSeries.id,
      seriesSlug: 'digital-city-series',
      yearCreated: 2026,
      medium: 'photo-collage',
      measurementType: ['digital'],
      recordOrigin: 'artist-catalogued',
      dcs: { editionTiers: [] },
    },
    overrideAccess: true,
    context: { skipEmbedding: true },
  })
  const dcsSnap = snapshotTiers(dcsCreated.dcs?.editionTiers)
  assert(dcsSnap.count === 3, `Expected 3 DCS tiers, got ${dcsSnap.count}`)
  assert(
    JSON.stringify(dcsSnap.rows.map((row) => row.seriesEditionTier)) ===
      JSON.stringify(dcsTierIds),
    'DCS tier ids mismatch',
  )
  console.log('   PASS')

  console.log('2) New Megacities artwork with empty print.editions[]')
  const megacitiesCreated = await payload.create({
    collection: 'artworks',
    data: {
      title: 'Verify Megacities Autopopulate',
      slug: MEGACITIES_TEST_SLUG,
      status: 'draft',
      creator: artist!.id,
      series: megacitiesSeries.id,
      seriesSlug: 'megacities',
      yearCreated: 2026,
      medium: 'photo-collage',
      measurementType: ['digital'],
      recordOrigin: 'artist-catalogued',
      megacities: {
        print: {
          printAvailable: true,
          editions: [],
        },
      },
    },
    overrideAccess: true,
    context: { skipEmbedding: true },
  })
  const megSnap = snapshotTiers(megacitiesCreated.megacities?.print?.editions)
  assert(megSnap.count === 3, `Expected 3 Megacities tiers, got ${megSnap.count}`)
  assert(
    JSON.stringify(megSnap.rows.map((row) => row.seriesEditionTier)) ===
      JSON.stringify(megacitiesTierIds),
    'Megacities tier ids mismatch',
  )
  console.log('   PASS')

  console.log('3) Basel re-save unchanged')
  const baselBefore = (
    await payload.find({
      collection: 'artworks',
      where: { slug: { equals: BASEL_SLUG } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
  ).docs[0]!
  const baselSnapBefore = snapshotTiers(baselBefore.dcs?.editionTiers)
  const baselAfter = await payload.update({
    collection: 'artworks',
    id: baselBefore.id,
    data: { reasoningStatus: baselBefore.reasoningStatus ?? 'complete' },
    overrideAccess: true,
    context: { skipEmbedding: true },
  })
  assert(
    JSON.stringify(snapshotTiers(baselAfter.dcs?.editionTiers)) === JSON.stringify(baselSnapBefore),
    'Basel tiers changed',
  )
  console.log('   PASS')

  console.log('4) Non-DCS, non-Megacities artwork unaffected')
  const gatesBefore = (
    await payload.find({
      collection: 'artworks',
      where: { slug: { equals: GATES_SLUG } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
  ).docs[0]!
  const gatesSnapBefore = snapshotTiers(gatesBefore.dcs?.editionTiers)
  const gatesAfter = await payload.update({
    collection: 'artworks',
    id: gatesBefore.id,
    data: { reasoningStatus: gatesBefore.reasoningStatus ?? 'complete' },
    overrideAccess: true,
    context: { skipEmbedding: true },
  })
  assert(
    JSON.stringify(snapshotTiers(gatesAfter.dcs?.editionTiers)) === JSON.stringify(gatesSnapBefore),
    'Gates gained edition tiers',
  )
  console.log('   PASS')

  console.log('5) Blank manual DCS tier row rejected')
  let blankRejected = false
  try {
    await payload.update({
      collection: 'artworks',
      id: dcsCreated.id,
      data: { dcs: { editionTiers: [{}] } },
      overrideAccess: true,
      context: { skipEmbedding: true, skipSeriesEditionTierAutopopulate: true },
    })
  } catch {
    blankRejected = true
  }
  assert(blankRejected, 'Blank DCS tier was allowed')
  console.log('   PASS')

  await cleanup(payload)
  console.log('\nAll verification steps passed.')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
