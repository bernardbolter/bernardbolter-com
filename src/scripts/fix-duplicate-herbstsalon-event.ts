/**
 * Fix duplicate Herbstsalon Events records
 * (docs/corpus/cursor-instruction-fix-duplicate-herbstsalon-event.md).
 *
 * Keeps the 2022 / Zwitschermachine stub, updates confirmed facts, links
 * Almadinat Alearabia + Deutsche Stadt, creates People for co-exhibitors,
 * deletes the 2023 / Pallaseum duplicate.
 *
 * Usage: npx tsx src/scripts/fix-duplicate-herbstsalon-event.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })

import { getPayload } from 'payload'
import config from '@payload-config'

const KEEP_YEAR = 2022
const DELETE_YEAR = 2023

const CO_EXHIBITORS = [
  'Beatrice Jugert',
  'Zoltan Labas',
  'Leïla Benbaouche',
  'Carsten Lisecki',
  'Hannah Becher',
  'Hartmut Jahn',
  'Lorena Terzi',
  'Nahed Mansour',
  'Giò di Sera',
  'Laura Lukitsch',
  'Michael Schmacke',
  'Inga Kat Coleman',
  'Regine Torbjørnsen',
  'Cirenia Jahn Fernández',
  'Niklas Fanelsa',
] as const

const ARTWORK_SLUGS = ['almadinat-alearabia', 'deutsche-stadt'] as const

const PRESENTATION_NOTE =
  "Bernard's contribution was one 'stop' within TRACES | perceptions | reflections, a multi-artist walking piece weaving each artist's own reflections with video documentation of the neighborhood. His stop was titled BLICK OBEN ('View From Above'), presenting Almadinat Alearabia."

function titleLooksLikeHerbstsalon(title: string): boolean {
  const n = title.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  return n.includes('herbstsalon') || n.includes('herbst salon')
}

function venueHint(venue: string | null | undefined): 'zwitscher' | 'pallaseum' | 'other' {
  const n = (venue ?? '').toLowerCase()
  if (n.includes('zwitscher') || n.includes('palladium')) return 'zwitscher'
  if (n.includes('pallaseum') || n.includes('pallasseum')) return 'pallaseum'
  return 'other'
}

async function findOrCreatePerson(
  payload: Awaited<ReturnType<typeof getPayload>>,
  name: string,
): Promise<number> {
  const existing = await payload.find({
    collection: 'people',
    where: { name: { equals: name } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (existing.docs[0]) return existing.docs[0].id

  // Accent / spelling variants: loose contains on first token
  const first = name.split(/\s+/)[0] ?? name
  const loose = await payload.find({
    collection: 'people',
    where: { name: { contains: first } },
    limit: 20,
    depth: 0,
    overrideAccess: true,
  })
  const exactish = loose.docs.find(
    (p) => p.name.trim().toLowerCase() === name.trim().toLowerCase(),
  )
  if (exactish) return exactish.id

  const created = await payload.create({
    collection: 'people',
    data: {
      name,
      role: ['artist'],
    },
    overrideAccess: true,
  })
  console.log(`  created People #${created.id}: ${name}`)
  return created.id
}

async function main() {
  const payload = await getPayload({ config })

  const found = await payload.find({
    collection: 'events',
    where: {
      or: [
        { title: { contains: 'Herbstsalon' } },
        { title: { contains: 'herbstsalon' } },
        { title: { contains: 'Komm ins Offene' } },
      ],
    },
    limit: 50,
    depth: 0,
    overrideAccess: true,
  })

  const candidates = found.docs.filter((doc) => titleLooksLikeHerbstsalon(doc.title ?? ''))
  console.log(
    `Found ${candidates.length} Herbstsalon candidate(s):`,
    candidates.map((d) => ({
      id: d.id,
      slug: d.slug,
      title: d.title,
      yearStart: d.yearStart,
      venueName: d.venueName,
    })),
  )

  if (candidates.length === 0) {
    console.error('No Herbstsalon events found — abort.')
    process.exit(1)
  }

  const byYear2022 = candidates.filter((d) => d.yearStart === KEEP_YEAR)
  const byYear2023 = candidates.filter((d) => d.yearStart === DELETE_YEAR)

  let keep =
    byYear2022.find((d) => venueHint(d.venueName) === 'zwitscher') ??
    byYear2022[0] ??
    candidates.find((d) => venueHint(d.venueName) === 'zwitscher')

  let remove =
    byYear2023.find((d) => venueHint(d.venueName) === 'pallaseum') ??
    byYear2023[0] ??
    candidates.find((d) => d.id !== keep?.id && venueHint(d.venueName) === 'pallaseum')

  if (!keep) {
    console.error('Could not identify the 2022 keep record — abort.')
    process.exit(1)
  }
  if (!remove) {
    // Maybe already fixed — still update keep
    console.warn('No 2023 duplicate found — will still update the keep record.')
  } else if (remove.id === keep.id) {
    console.error('Keep and delete resolved to the same id — abort.')
    process.exit(1)
  }

  console.log(`KEEP id=${keep.id} slug=${keep.slug} year=${keep.yearStart} venue=${keep.venueName}`)
  if (remove) {
    console.log(
      `DELETE id=${remove.id} slug=${remove.slug} year=${remove.yearStart} venue=${remove.venueName}`,
    )
  }

  const artworkIds: number[] = []
  for (const slug of ARTWORK_SLUGS) {
    const art = await payload.find({
      collection: 'artworks',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const doc = art.docs[0]
    if (!doc) {
      console.warn(`Artwork slug "${slug}" not found — skipping link.`)
      continue
    }
    artworkIds.push(doc.id)
    console.log(`  artwork ${slug} → #${doc.id}`)
  }

  // Merge any artwork ids already on keep or remove
  const existingArtworkIds = [
    ...(keep.artworks ?? []),
    ...((remove?.artworks ?? []) as unknown[]),
  ]
    .map((entry) => {
      if (typeof entry === 'number') return entry
      if (entry && typeof entry === 'object' && 'id' in entry) return (entry as { id: number }).id
      return null
    })
    .filter((id): id is number => typeof id === 'number')

  const mergedArtworks = [...new Set([...existingArtworkIds, ...artworkIds])]

  console.log('Resolving co-exhibitors → People…')
  const coExhibitors: Array<{ person: number }> = []
  for (const name of CO_EXHIBITORS) {
    const personId = await findOrCreatePerson(payload, name)
    coExhibitors.push({ person: personId })
  }

  const updated = await payload.update({
    collection: 'events',
    id: keep.id,
    data: {
      title: 'Herbstsalon im Frühling',
      eventType: 'group-exhibition',
      startDate: '2022-03-31',
      endDate: '2022-04-24',
      // yearStart derived from startDate in beforeChange
      venueName: 'ZWITSCHERMASCHINE (Palladium Studios, 5th floor, Pallasseum)',
      venueCity: 'Berlin',
      venueCountry: 'Germany',
      venueAddress: 'Palladium Studios, 5th floor, Pallasseum, Berlin, Germany',
      sameAs: [{ uri: 'http://herbstsalon.berlin/' }],
      coExhibitors,
      artworks: mergedArtworks,
      artworkPresentationNote: PRESENTATION_NOTE,
      status: 'published',
    },
    overrideAccess: true,
    // Let deriveEnrichmentStatus run: sameAs + venueAddress → partial
  })

  console.log(
    `Updated keep → title="${updated.title}" yearStart=${updated.yearStart} enrichmentStatus=${updated.enrichmentStatus} slug=${updated.slug}`,
  )

  if (remove) {
    await payload.delete({
      collection: 'events',
      id: remove.id,
      overrideAccess: true,
    })
    console.log(`Deleted duplicate id=${remove.id}`)
  }

  const verify = await payload.find({
    collection: 'events',
    where: {
      or: [
        { title: { contains: 'Herbstsalon' } },
        { title: { contains: 'Komm ins Offene' } },
      ],
    },
    limit: 20,
    depth: 0,
    overrideAccess: true,
  })
  const remaining = verify.docs.filter((d) => titleLooksLikeHerbstsalon(d.title ?? ''))
  console.log(
    'Remaining Herbstsalon events:',
    remaining.map((d) => ({
      id: d.id,
      slug: d.slug,
      title: d.title,
      yearStart: d.yearStart,
      venueName: d.venueName,
      enrichmentStatus: d.enrichmentStatus,
    })),
  )

  if (remaining.length !== 1) {
    console.error(`Expected exactly 1 Herbstsalon event, found ${remaining.length}`)
    process.exit(1)
  }
  if (remaining[0]!.id !== keep.id) {
    console.error('Remaining record is not the kept id — unexpected.')
    process.exit(1)
  }
  if (remaining[0]!.yearStart !== 2022) {
    console.error('Kept record yearStart is not 2022.')
    process.exit(1)
  }

  console.log('Done.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
