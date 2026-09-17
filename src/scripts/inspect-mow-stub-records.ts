/**
 * Read-only dump of Mediums of War stub state (artworks, series, triptychs, ICT vocab).
 *
 * Usage: pnpm tsx src/scripts/inspect-mow-stub-records.ts
 */
import { getPayload } from 'payload'

import config from '@payload-config'

function seriesRef(value: unknown): { id?: number; slug?: string; name?: string } {
  if (value == null) return {}
  if (typeof value === 'number') return { id: value }
  if (typeof value === 'object') {
    const v = value as { id?: number; slug?: string; name?: string }
    return { id: v.id, slug: v.slug, name: v.name }
  }
  return {}
}

function summarizeAch(ach: Record<string, unknown> | null | undefined) {
  if (!ach) return null
  const mapAndTour = (ach.mapAndTour ?? null) as Record<string, unknown> | null
  const overlay = (ach.overlay ?? null) as Record<string, unknown> | null
  const sourcePhotograph = (ach.sourcePhotograph ?? null) as Record<string, unknown> | null
  const location = (ach.location ?? null) as Record<string, unknown> | null
  const revealSlider = (ach.revealSlider ?? null) as Record<string, unknown> | null
  const ar = (ach.ar ?? null) as Record<string, unknown> | null
  const mop = (ach.mop ?? null) as Record<string, unknown> | null
  return {
    internalGroupTitle: ach.internalGroupTitle ?? null,
    group1_mapAndTour: mapAndTour,
    group2_overlay: overlay,
    group3_sourcePhotographsCount: Array.isArray(ach.sourcePhotographs)
      ? ach.sourcePhotographs.length
      : 0,
    group3_sourcePhotograph: sourcePhotograph,
    group4_location: location,
    group5_revealSlider: revealSlider,
    group6_ar: ar,
    group7_mop: mop,
  }
}

async function main() {
  const payload = await getPayload({ config })

  const titleOr: Array<Record<string, unknown>> = [
    { title: { contains: 'WWI' } },
    { title: { contains: 'World War I' } },
    { title: { contains: 'WWII' } },
    { title: { contains: 'World War II' } },
    { title: { contains: 'Vietnam' } },
    { title: { contains: 'Mediums of War' } },
    { slug: { contains: 'wwi' } },
    { slug: { contains: 'wwii' } },
    { slug: { contains: 'vietnam' } },
    { slug: { contains: 'mediums-of-war' } },
  ]

  const artworks = await payload.find({
    collection: 'artworks',
    where: { or: titleOr },
    limit: 50,
    depth: 1,
    locale: 'en',
    overrideAccess: true,
  })

  console.log('\n=== ARTWORKS (title/slug search) ===')
  console.log('count', artworks.docs.length)
  for (const doc of artworks.docs) {
    const series = seriesRef(doc.series)
    console.log(
      JSON.stringify(
        {
          id: doc.id,
          title: doc.title,
          slug: doc.slug,
          status: doc.status,
          seriesSlug: doc.seriesSlug,
          series,
          city: doc.city ?? null,
          country: doc.country ?? null,
          availabilityStatus: doc.availabilityStatus ?? null,
          mop_triptychPosition: doc.mop_triptychPosition ?? null,
          mop_triptychGroupNote: doc.mop_triptychGroupNote ?? null,
          mop_imageCaptureType: doc.mop_imageCaptureType ?? null,
          ach: summarizeAch(doc.ach as Record<string, unknown> | undefined),
        },
        null,
        2,
      ),
    )
  }

  const seriesDocs = await payload.find({
    collection: 'series',
    where: {
      or: [
        { slug: { equals: 'mediums-of-war' } },
        { slug: { equals: 'mediums-of-perception' } },
        { name: { contains: 'Mediums of War' } },
      ],
    },
    limit: 20,
    depth: 1,
    locale: 'en',
    overrideAccess: true,
  })

  console.log('\n=== SERIES ===')
  for (const doc of seriesDocs.docs) {
    const parent = seriesRef(doc.parentSeries)
    const tagged = await payload.find({
      collection: 'artworks',
      where: { series: { equals: doc.id } },
      limit: 100,
      depth: 0,
      overrideAccess: true,
    })
    console.log(
      JSON.stringify(
        {
          id: doc.id,
          slug: doc.slug,
          name: doc.name,
          status: doc.status,
          parentSeries: parent,
          taggedArtworkCount: tagged.totalDocs,
          taggedArtworks: tagged.docs.map((a) => ({ id: a.id, title: a.title, slug: a.slug })),
        },
        null,
        2,
      ),
    )
  }

  const triptychs = await payload.find({
    collection: 'triptychs',
    limit: 50,
    depth: 1,
    locale: 'en',
    overrideAccess: true,
  })

  console.log('\n=== TRIPTYCHS (all) ===')
  console.log('count', triptychs.docs.length)
  for (const doc of triptychs.docs) {
    console.log(
      JSON.stringify(
        {
          id: doc.id,
          title: doc.title,
          slug: doc.slug,
          status: doc.status,
          series: seriesRef(doc.series),
          city: doc.city ?? null,
          yearStart: doc.yearStart ?? null,
          yearCompleted: doc.yearCompleted ?? null,
          panels: doc.panels,
          printSets: doc.printSets ?? null,
          discoverable: (doc as { discoverable?: unknown }).discoverable,
        },
        null,
        2,
      ),
    )
  }

  const ict = await payload.find({
    collection: 'image-capture-technologies',
    limit: 50,
    depth: 0,
    locale: 'en',
    sort: 'slug',
    overrideAccess: true,
  })

  console.log('\n=== IMAGE CAPTURE TECHNOLOGIES ===')
  for (const doc of ict.docs) {
    console.log({
      id: doc.id,
      slug: doc.slug,
      name: doc.name,
      approximatePeriodStart: doc.approximatePeriodStart,
      approximatePeriodEnd: doc.approximatePeriodEnd,
    })
  }

  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
