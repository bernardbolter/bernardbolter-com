/**
 * Artwork fixture seed — styling reference for the layered artwork page.
 *
 * Creates a single draft artwork (`__fixture-gates-iii`). Never publish this record.
 *
 * Usage:
 *   pnpm seed:artwork-fixture
 *   npx payload run src/seed/artworkFixture.ts
 */
import { getPayload } from 'payload'

import config from '@payload-config'
import {
  ARTWORK_FIXTURE_EVENT_SLUG,
  ARTWORK_FIXTURE_SLUG,
  buildArtworkFixtureData,
  type ArtworkFixtureRelations,
} from '@/seed/artworkFixtureData'

const TAG_DEFS = [
  { label: 'Post-internet', type: 'movement' as const },
  { label: 'Contemporary', type: 'period' as const },
  { label: 'Abstraction', type: 'style' as const },
  { label: 'Photography', type: 'style' as const },
  { label: 'Collage', type: 'style' as const },
  { label: 'Memory', type: 'subject' as const },
  { label: 'Erasure', type: 'subject' as const },
  { label: 'Archive', type: 'subject' as const },
  { label: 'Painting', type: 'genre' as const },
]

const REF_DEFS = [
  {
    artworkTitle: 'Retroactive I',
    artistName: 'Robert Rauschenberg',
    yearCreated: 1964,
    medium: 'Oil and silkscreen ink on canvas',
    institution: 'Wadsworth Atheneum Museum of Art',
    referenceUrl: 'https://www.wikidata.org/wiki/Q27987985',
    notes:
      "The photographic layer present but never fully legible — the transfer logic is the same, but here the painted field explicitly interrupts rather than integrates. Rauschenberg's transfer work is the clearest precedent for treating the photograph as a surface to be worked against rather than a subject to be reproduced.",
  },
  {
    artworkTitle: 'Photo Paintings (Fotobilder)',
    artistName: 'Gerhard Richter',
    yearCreated: 1964,
    medium: 'Oil on canvas',
    institution: 'Various',
    referenceUrl: 'https://www.gerhard-richter.com/en/art/paintings/photo-paintings',
    notes:
      "The blur in Richter's photo paintings comes from the brush; in the Gates work it comes from the act of transfer itself, which produces a similar conditional legibility. Both use the photograph as a starting point while refusing to let it be simply a record.",
  },
]

async function resolveSeriesId(
  payload: Awaited<ReturnType<typeof getPayload>>,
): Promise<number> {
  const series = await payload.find({
    collection: 'series',
    where: { slug: { equals: 'a-colorful-history' } },
    limit: 1,
    overrideAccess: true,
  })
  if (!series.docs[0]) {
    throw new Error(
      'Series "a-colorful-history" not found. Create it in the admin before running this seed.',
    )
  }
  return series.docs[0].id
}

async function resolveCreatorId(
  payload: Awaited<ReturnType<typeof getPayload>>,
): Promise<number> {
  const artists = await payload.find({
    collection: 'artists',
    limit: 1,
    overrideAccess: true,
  })
  if (!artists.docs[0]) {
    throw new Error('No artist record found. Create an artist before running this seed.')
  }
  return artists.docs[0].id
}

async function resolveTagIds(
  payload: Awaited<ReturnType<typeof getPayload>>,
): Promise<Record<string, number>> {
  const tagIds: Record<string, number> = {}

  for (const def of TAG_DEFS) {
    const existing = await payload.find({
      collection: 'tags',
      where: { label: { equals: def.label } },
      limit: 1,
      overrideAccess: true,
    })

    if (existing.docs[0]) {
      tagIds[def.label] = existing.docs[0].id
      continue
    }

    const created = await payload.create({
      collection: 'tags',
      data: { label: def.label, type: def.type },
      overrideAccess: true,
    })
    tagIds[def.label] = created.id
  }

  return tagIds
}

async function resolveArtHistoricalReferenceIds(
  payload: Awaited<ReturnType<typeof getPayload>>,
): Promise<number[]> {
  const refIds: number[] = []

  for (const ref of REF_DEFS) {
    const existing = await payload.find({
      collection: 'art-historical-references',
      where: { artworkTitle: { equals: ref.artworkTitle } },
      limit: 1,
      overrideAccess: true,
    })

    if (existing.docs[0]) {
      refIds.push(existing.docs[0].id)
      continue
    }

    const created = await payload.create({
      collection: 'art-historical-references',
      data: ref,
      overrideAccess: true,
    })
    refIds.push(created.id)
  }

  return refIds
}

async function upsertFixtureEvent(
  payload: Awaited<ReturnType<typeof getPayload>>,
  artworkId: number,
): Promise<number> {
  const existing = await payload.find({
    collection: 'events',
    where: { slug: { equals: ARTWORK_FIXTURE_EVENT_SLUG } },
    limit: 1,
    overrideAccess: true,
  })

  const eventData = {
    title: 'Signals & Noise',
    slug: ARTWORK_FIXTURE_EVENT_SLUG,
    eventType: 'group-exhibition' as const,
    status: 'draft' as const,
    startDate: '2022-09-10',
    endDate: '2022-11-20',
    venueName: 'Galerie Nord',
    venueCity: 'Berlin',
    venueCountry: 'Germany',
    descriptionShort: 'Fixture event for styling purposes. Not a real exhibition.',
    artworks: [artworkId],
    hasPage: true,
    enrichmentStatus: 'complete' as const,
  }

  if (existing.docs[0]) {
    const updated = await payload.update({
      collection: 'events',
      id: existing.docs[0].id,
      data: eventData,
      overrideAccess: true,
      context: { skipEmbedding: true },
    })
    return updated.id
  }

  const created = await payload.create({
    collection: 'events',
    data: eventData,
    overrideAccess: true,
    context: { skipEmbedding: true },
  })
  return created.id
}

async function seed() {
  const payload = await getPayload({ config })

  const relations: ArtworkFixtureRelations = {
    seriesId: await resolveSeriesId(payload),
    creatorId: await resolveCreatorId(payload),
    tagIds: await resolveTagIds(payload),
    artHistoricalReferenceIds: await resolveArtHistoricalReferenceIds(payload),
  }

  const fixtureData = buildArtworkFixtureData(relations)

  const existing = await payload.find({
    collection: 'artworks',
    where: { slug: { equals: ARTWORK_FIXTURE_SLUG } },
    limit: 1,
    overrideAccess: true,
  })

  let artworkId: number

  if (existing.docs[0]) {
    const updated = await payload.update({
      collection: 'artworks',
      id: existing.docs[0].id,
      data: fixtureData,
      overrideAccess: true,
      context: { skipEmbedding: true },
    })
    artworkId = updated.id
    console.log('✓ Fixture artwork updated:', artworkId)
  } else {
    const created = await payload.create({
      collection: 'artworks',
      data: fixtureData,
      overrideAccess: true,
      context: { skipEmbedding: true },
    })
    artworkId = created.id
    console.log('✓ Fixture artwork created:', artworkId)
  }

  const eventId = await upsertFixtureEvent(payload, artworkId)
  console.log('✓ Fixture event linked:', eventId)

  console.log('\nFixture seed complete.')
  console.log(`Slug: ${ARTWORK_FIXTURE_SLUG}`)
  console.log('Status: draft — do not publish')
  console.log('\nPreview in admin: /admin/collections/artworks')
  console.log('(Public route stays 404 until published — fixture slugs cannot be published.)')
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fixture seed failed:', err)
    process.exit(1)
  })
