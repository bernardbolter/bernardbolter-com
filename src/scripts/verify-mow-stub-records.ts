/**
 * Verify Mediums of War stub fix. Usage: npx tsx src/scripts/verify-mow-stub-records.ts
 */
import { getPayload } from 'payload'

import config from '@payload-config'

function rel(value: unknown) {
  if (value == null) return null
  if (typeof value === 'number') return { id: value }
  if (typeof value === 'object') {
    const v = value as { id?: number; slug?: string; name?: string }
    return { id: v.id, slug: v.slug, name: v.name }
  }
  return value
}

async function main() {
  const payload = await getPayload({ config })
  const slugs = ['world-war-one', 'world-war-two', 'vietnam-war-in-video-stills']
  for (const slug of slugs) {
    const { docs } = await payload.find({
      collection: 'artworks',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 1,
      locale: 'en',
      overrideAccess: true,
    })
    const a = docs[0]
    if (!a) {
      console.log(slug, 'MISSING')
      continue
    }
    const ach = a.ach
    console.log('\n---', slug, 'id', a.id, '---')
    console.log('title', a.title)
    console.log('seriesSlug', a.seriesSlug, 'series', rel(a.series))
    console.log('city', a.city)
    console.log('mapPresence', ach?.mapAndTour?.mapPresence, 'lat', ach?.mapAndTour?.lat, 'lng', ach?.mapAndTour?.lng)
    console.log('cityPlaceholderColor', ach?.mapAndTour?.cityPlaceholderColor)
    console.log('overlayColors', ach?.overlay?.overlayColors)
    console.log('overlayRects', ach?.overlay?.overlayRects)
    console.log('sourceImage', ach?.sourcePhotograph?.sourceImage)
    console.log('keyHistoricalDates', ach?.location?.keyHistoricalDates)
    console.log('olderStory', ach?.location?.olderStory)
    console.log('newerStory', ach?.location?.newerStory)
    console.log('transferImage', ach?.revealSlider?.transferImage, 'sliderAxis', ach?.revealSlider?.sliderAxis)
    console.log('arEnabled', ach?.ar?.arEnabled)
    console.log('mop', {
      triptychPosition: ach?.mop?.triptychPosition,
      imageCaptureType: rel(ach?.mop?.imageCaptureType),
      imageCaptureLabel: ach?.mop?.imageCaptureLabel,
      availabilityStatus: ach?.mop?.availabilityStatus,
      relatedTriptychs: ach?.mop?.relatedTriptychs,
    })
  }

  const triptych = await payload.find({
    collection: 'triptychs',
    where: { slug: { equals: 'mediums-of-war' } },
    limit: 1,
    depth: 1,
    locale: 'en',
    overrideAccess: true,
  })
  const t = triptych.docs[0]
  console.log('\n--- triptych ---')
  if (!t) {
    console.log('MISSING')
  } else {
    console.log({
      id: t.id,
      title: t.title,
      slug: t.slug,
      status: t.status,
      discoverable: t.discoverable,
      series: rel(t.series),
      city: t.city,
      yearStart: t.yearStart,
      yearCompleted: t.yearCompleted,
      printSets: t.printSets,
      panels: t.panels?.map((p) => ({
        position: p.position,
        artwork: typeof p.artwork === 'object' ? { id: p.artwork.id, slug: p.artwork.slug, title: p.artwork.title } : p.artwork,
      })),
    })
  }

  const mowSeries = await payload.find({
    collection: 'series',
    where: { slug: { equals: 'mediums-of-war' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const s = mowSeries.docs[0]
  if (s) {
    const tagged = await payload.find({
      collection: 'artworks',
      where: { series: { equals: s.id } },
      limit: 20,
      depth: 0,
      overrideAccess: true,
    })
    console.log('\n--- series mediums-of-war ---')
    console.log({
      id: s.id,
      status: s.status,
      taggedArtworkCount: tagged.totalDocs,
      tagged: tagged.docs.map((d) => d.slug),
    })
  }

  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
