/**
 * Idempotent fix for Mediums of War stub records:
 * - retag WWI / WWII / Vietnam onto Mediums of Perception
 * - fill Group 7 placeholders
 * - create the nested Mediums of War triptych (discoverable: false)
 *
 * Prerequisite: `npx tsx src/scripts/add-triptych-discoverable-schema.ts`
 * and `npx tsx src/scripts/seed-image-capture-technologies.ts`
 *
 * Usage: npx tsx src/scripts/fix-mow-stub-records.ts
 */
import { getPayload } from 'payload'

import config from '@payload-config'

const MOP_SERIES_SLUG = 'mediums-of-perception'
const MOW_TRIPTYCH_SLUG = 'mediums-of-war'

const ARTWORKS = [
  {
    slug: 'world-war-one',
    triptychPosition: 'I' as const,
    imageCaptureTypeSlug: null,
    imageCaptureLabel: '[PLACEHOLDER] Black and white photography, WWI-era',
  },
  {
    slug: 'world-war-two',
    triptychPosition: 'II' as const,
    imageCaptureTypeSlug: 'color-photograph',
    imageCaptureLabel: '[PLACEHOLDER] Color photograph, WWII-era',
  },
  {
    slug: 'vietnam-war-in-video-stills',
    triptychPosition: 'III' as const,
    imageCaptureTypeSlug: 'video-16mm-film',
    imageCaptureLabel: '[PLACEHOLDER] Video, Vietnam War-era',
  },
] as const

async function findOneBySlug<T extends 'artworks' | 'series' | 'triptychs' | 'image-capture-technologies'>(
  payload: Awaited<ReturnType<typeof getPayload>>,
  collection: T,
  slug: string,
) {
  const result = await payload.find({
    collection,
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    locale: 'en',
    overrideAccess: true,
  })
  return result.docs[0] ?? null
}

function relationId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id: unknown }).id
    if (typeof id === 'number' && Number.isFinite(id)) return id
  }
  return null
}

async function main() {
  const payload = await getPayload({ config })

  const mop = await findOneBySlug(payload, 'series', MOP_SERIES_SLUG)
  if (!mop) {
    throw new Error(`Series "${MOP_SERIES_SLUG}" not found.`)
  }

  const ictBySlug = new Map<string, number>()
  for (const slug of ['color-photograph', 'video-16mm-film'] as const) {
    const doc = await findOneBySlug(payload, 'image-capture-technologies', slug)
    if (!doc) {
      throw new Error(
        `Image capture technology "${slug}" not found. Run seed-image-capture-technologies.ts first.`,
      )
    }
    ictBySlug.set(slug, doc.id)
  }

  const artworkIds: Record<(typeof ARTWORKS)[number]['triptychPosition'], number> = {
    I: 0,
    II: 0,
    III: 0,
  }

  for (const row of ARTWORKS) {
    const artwork = await findOneBySlug(payload, 'artworks', row.slug)
    if (!artwork) {
      throw new Error(`Artwork slug "${row.slug}" not found.`)
    }

    const existingAch = (artwork.ach ?? {}) as Record<string, unknown>
    const existingMap = (existingAch.mapAndTour ?? {}) as Record<string, unknown>
    const existingAr = (existingAch.ar ?? {}) as Record<string, unknown>
    const existingMop = (existingAch.mop ?? {}) as Record<string, unknown>

    const imageCaptureType =
      row.imageCaptureTypeSlug == null ? null : ictBySlug.get(row.imageCaptureTypeSlug) ?? null

    const mopAvailabilityUnset =
      existingMop.availabilityStatus == null || existingMop.availabilityStatus === ''

    // Only write ACH groups that exist on production today. Do not spread
    // neighborhoodCommission — that schema is not necessarily live yet.
    await payload.update({
      collection: 'artworks',
      id: artwork.id,
      locale: 'en',
      data: {
        series: mop.id,
        ach: {
          internalGroupTitle: existingAch.internalGroupTitle ?? null,
          mapAndTour: {
            ...existingMap,
            mapPresence: false,
            lat: null,
            lng: null,
          },
          overlay: existingAch.overlay ?? { overlayColors: [], overlayRects: [] },
          sourcePhotographs: existingAch.sourcePhotographs ?? [],
          sourcePhotograph: existingAch.sourcePhotograph ?? {},
          location: existingAch.location ?? {},
          revealSlider: existingAch.revealSlider ?? {},
          hero: existingAch.hero ?? {},
          ar: {
            ...existingAr,
            arEnabled: false,
          },
          mop: {
            ...existingMop,
            triptychPosition: row.triptychPosition,
            imageCaptureType,
            imageCaptureLabel: row.imageCaptureLabel,
            availabilityStatus: mopAvailabilityUnset
              ? 'original-available'
              : existingMop.availabilityStatus,
            relatedTriptychs: [],
          },
        },
      },
      overrideAccess: true,
    })

    artworkIds[row.triptychPosition] = artwork.id
    console.log(
      'updated artwork',
      row.slug,
      `(id ${artwork.id})`,
      `panel ${row.triptychPosition}`,
      mopAvailabilityUnset ? 'availabilityStatus=original-available [PLACEHOLDER]' : 'availabilityStatus kept',
    )
  }

  const existingTriptych = await findOneBySlug(payload, 'triptychs', MOW_TRIPTYCH_SLUG)
  const triptychData = {
    title: 'Mediums of War',
    slug: MOW_TRIPTYCH_SLUG,
    series: mop.id,
    discoverable: false,
    panels: [
      { artwork: artworkIds.I, position: 'I' as const },
      { artwork: artworkIds.II, position: 'II' as const },
      { artwork: artworkIds.III, position: 'III' as const },
    ],
  }

  if (existingTriptych) {
    const currentSeries = relationId(existingTriptych.series)
    await payload.update({
      collection: 'triptychs',
      id: existingTriptych.id,
      locale: 'en',
      data: {
        ...triptychData,
        // status is required on the collection; do not invent published/archived.
        status: existingTriptych.status,
      },
      overrideAccess: true,
    })
    console.log(
      'updated triptych',
      MOW_TRIPTYCH_SLUG,
      `(id ${existingTriptych.id})`,
      currentSeries === mop.id ? 'series already MoP' : `series ${currentSeries} → ${mop.id}`,
    )
  } else {
    const created = await payload.create({
      collection: 'triptychs',
      locale: 'en',
      data: {
        ...triptychData,
        status: 'draft',
      },
      overrideAccess: true,
    })
    console.log(
      'created triptych',
      MOW_TRIPTYCH_SLUG,
      `(id ${created.id})`,
      'status=draft [schema default — Bernard to confirm]',
      'discoverable=false',
    )
  }

  console.log('done')
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
