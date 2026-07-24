/**
 * Seed Deutsche Skate Stadt planned work
 * (docs/corpus/planned-works-schema-addendum.md Section 4).
 *
 * Idempotent on title match.
 *
 * Usage: npx tsx src/scripts/seed-planned-work-deutsche-skate-stadt.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })

import { getPayload } from 'payload'
import config from '@payload-config'

const TITLE = 'Deutsche Skate Stadt'

const MOTIVATING_NOTE =
  "Relaunches the Megacities series. Resolves the zoom-level problem Deutsche Stadt couldn't: city-scale satellite imagery was used instead of skatepark-scale because European resolution isn't good enough at that zoom to actually see the skateparks and places."

const BLOCKER =
  'Satellite imagery resolution in Germany/Europe insufficient at skatepark zoom level — commercial satellite coverage (Maxar, Google) concentrates higher resolution and refresh rate over the US, a structural bias also relevant to the Almadinat Alearabia vision-analysis discrepancy discussed in the same session.'

const DEUTSCHE_STADT_SLUG_CANDIDATES = [
  'deutsche-stadt',
  'deutsche-stadt-1',
  'megacities-deutsche-stadt',
]

async function main() {
  const payload = await getPayload({ config })

  const artists = await payload.find({
    collection: 'artists',
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const artist = artists.docs[0]
  if (!artist) {
    console.error('No artist record found.')
    process.exit(1)
  }

  const existing = (artist.plannedWorks ?? []).find(
    (entry) => entry.title?.trim().toLowerCase() === TITLE.toLowerCase(),
  )
  if (existing) {
    console.log(`Planned work "${TITLE}" already present — skip.`)
    process.exit(0)
  }

  const seriesResult = await payload.find({
    collection: 'series',
    where: { slug: { equals: 'megacities' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const megacities = seriesResult.docs[0]
  if (!megacities) {
    console.warn('Series "megacities" not found — seeding without relatedSeries.')
  }

  let deutscheStadtId: number | null = null
  for (const slug of DEUTSCHE_STADT_SLUG_CANDIDATES) {
    const found = await payload.find({
      collection: 'artworks',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    if (found.docs[0]) {
      deutscheStadtId = found.docs[0].id
      console.log(`Linked related artwork ${slug} (id ${deutscheStadtId})`)
      break
    }
  }
  if (!deutscheStadtId) {
    const byTitle = await payload.find({
      collection: 'artworks',
      where: { title: { contains: 'Deutsche Stadt' } },
      limit: 5,
      depth: 0,
      overrideAccess: true,
    })
    const exact = byTitle.docs.find(
      (doc) => doc.title?.trim().toLowerCase() === 'deutsche stadt',
    )
    if (exact) {
      deutscheStadtId = exact.id
      console.log(`Linked related artwork by title "${exact.title}" (id ${deutscheStadtId})`)
    } else if (byTitle.docs[0]) {
      deutscheStadtId = byTitle.docs[0].id
      console.log(
        `Linked related artwork by fuzzy title "${byTitle.docs[0].title}" (id ${deutscheStadtId})`,
      )
    } else {
      console.warn('Deutsche Stadt artwork not found — seeding without relatedArtworks.')
    }
  }

  const next = [
    ...(artist.plannedWorks ?? []),
    {
      title: TITLE,
      motivatingNote: MOTIVATING_NOTE,
      blocker: BLOCKER,
      relatedSeries: megacities?.id,
      relatedArtworks: deutscheStadtId ? [deutscheStadtId] : [],
      status: 'idea' as const,
      dateNamed: '2026-07-24',
    },
  ]

  await payload.update({
    collection: 'artists',
    id: artist.id,
    data: { plannedWorks: next },
    overrideAccess: true,
  })

  console.log(`Seeded planned work "${TITLE}".`)
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
