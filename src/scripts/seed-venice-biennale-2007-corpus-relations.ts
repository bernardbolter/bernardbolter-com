/**
 * Seed Venice Biennale 2007 corpus relation + linchpin session data
 * (docs/corpus/corpus-relation-fields-and-linchpin-sessions-spec.md Part 4).
 *
 * Idempotent: skips rows that already exist (matching text / relation / throughline).
 *
 * Usage: pnpm tsx src/scripts/seed-venice-biennale-2007-corpus-relations.ts
 */
import { randomUUID } from 'crypto'
import { getPayload } from 'payload'

import config from '@payload-config'

const VENICE_SLUG = 'venice-biennale-2007'
const MUNSTER_SLUG_CANDIDATES = [
  'skulptur-projekte-m-nster-2007',
  'skulptur-projekte-munster-2007',
  'skulptur-projekte-muenster-2007',
]

const LINCHPIN_NOTE =
  'Cataloguing Venice Biennale 2007 surfaced the Breaking Down Art → DCS transition and the 1996 SFMOMA origin of the series.'

const BIO_1996 =
  "After the SFMOMA guerrilla installation, a three-part series attempting to bring photographs back into painting 'didn't all work out' — followed by writing ~30 ideas about art, which became the seed of the Breaking Down Art series."

const BIO_2007 =
  'On a Rietveld Akademie school trip to the Venice Biennale, photographed material for Breaking Down Art from inside the Arsenale while simultaneously shooting the Venice DCS scene from just outside the same building — unrecognized as a doubled operation until this session.'

const THROUGHLINE =
  "A recurring inside/outside position: in 2007–08, working from inside the art school system, half in awe of a world he wasn't sure he belonged to. Now working fully outside it, on his own path — and that outside position may be exactly what's needed to return to Breaking Down Art's unfinished questions with clear eyes."

const RELATION_NOTE =
  'Same instinct — architecture compressing a place/viewing-experience into the painting. Immediate predecessor.'

const HINGE_NOTE = 'Last Breaking Down Art work before abandoning the series for DCS.'

async function findArtworkBySlugCandidates(
  payload: Awaited<ReturnType<typeof getPayload>>,
  slugs: string[],
) {
  for (const slug of slugs) {
    const result = await payload.find({
      collection: 'artworks',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    if (result.docs[0]) return result.docs[0]
  }
  return null
}

function entryTextKey(text: string): string {
  return text.trim()
}

async function main() {
  const payload = await getPayload({ config })

  const venice = await findArtworkBySlugCandidates(payload, [VENICE_SLUG])
  if (!venice) {
    console.error(`Artwork "${VENICE_SLUG}" not found. Create/publish it first, then re-run.`)
    process.exit(1)
  }

  const munster = await findArtworkBySlugCandidates(payload, MUNSTER_SLUG_CANDIDATES)
  if (!munster) {
    console.error(
      `Münster companion artwork not found. Tried: ${MUNSTER_SLUG_CANDIDATES.join(', ')}`,
    )
    process.exit(1)
  }

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

  // Session (linchpin) — create or reuse by sessionId
  const sessionId = `venice-biennale-2007-linchpin-2026-07-23`
  const existingSessions = await payload.find({
    collection: 'sessions',
    where: { sessionId: { equals: sessionId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  let session = existingSessions.docs[0]
  if (!session) {
    session = await payload.create({
      collection: 'sessions',
      data: {
        sessionId: sessionId || randomUUID(),
        sessionType: 'artwork-cataloguing',
        status: 'completed',
        artistId: artist.id,
        primaryArtwork: venice.id,
        artworkRecord: venice.id,
        mentionedArtworks: [munster.id],
        linchpinFlag: {
          isLinchpin: true,
          note: LINCHPIN_NOTE,
        },
        completedAt: new Date().toISOString(),
      },
      overrideAccess: true,
    })
    console.log(`Created linchpin session ${session.sessionId} (id ${session.id})`)
  } else {
    await payload.update({
      collection: 'sessions',
      id: session.id,
      data: {
        linchpinFlag: {
          isLinchpin: true,
          note: LINCHPIN_NOTE,
        },
        status: 'completed',
        primaryArtwork: venice.id,
        artworkRecord: venice.id,
        mentionedArtworks: [munster.id],
      },
      overrideAccess: true,
    })
    console.log(`Updated linchpin session ${session.sessionId} (id ${session.id})`)
  }

  // Artwork relation + hinge
  const existingRelations = Array.isArray(venice.relatedWorksAtMaking)
    ? venice.relatedWorksAtMaking
    : []
  const alreadyLinked = existingRelations.some((row) => {
    const relatedId =
      typeof row.relatedArtwork === 'object' && row.relatedArtwork
        ? row.relatedArtwork.id
        : row.relatedArtwork
    return relatedId === munster.id && row.relationType === 'paired'
  })

  const nextRelations = alreadyLinked
    ? existingRelations
    : [
        ...existingRelations,
        {
          relatedArtwork: munster.id,
          relationType: 'paired' as const,
          note: RELATION_NOTE,
          sourceSessionRef: session.id,
        },
      ]

  await payload.update({
    collection: 'artworks',
    id: venice.id,
    data: {
      relatedWorksAtMaking: nextRelations,
      seriesHingeMarker: {
        isHinge: true,
        hingeType: 'series-end',
        note: HINGE_NOTE,
      },
    },
    overrideAccess: true,
  })
  console.log(
    alreadyLinked
      ? `Venice already had paired relation to ${munster.slug}; hinge marker refreshed.`
      : `Linked Venice → ${munster.slug} as paired; hinge marker set.`,
  )

  // Artist bio + throughline appends (idempotent on text)
  const bios = [...(artist.bioTimelineEntries ?? [])]
  for (const entry of [
    {
      eventDate: '1996',
      text: BIO_1996,
      sourceSessionRef: session.id,
      linkedArtworkSlugs: [venice.id],
      visibility: 'public' as const,
    },
    {
      eventDate: '2007',
      text: BIO_2007,
      sourceSessionRef: session.id,
      linkedArtworkSlugs: [venice.id, munster.id],
      visibility: 'public' as const,
    },
  ]) {
    if (bios.some((row) => entryTextKey(row.text ?? '') === entryTextKey(entry.text))) {
      console.log(`Bio entry ${entry.eventDate} already present — skip`)
      continue
    }
    bios.push(entry)
    console.log(`Appended bio entry ${entry.eventDate}`)
  }

  const throughlines = [...(artist.statementThroughlines ?? [])]
  if (
    !throughlines.some((row) => entryTextKey(row.text ?? '') === entryTextKey(THROUGHLINE))
  ) {
    throughlines.push({
      dateRecognized: '2026-07-23',
      text: THROUGHLINE,
      linkedArtworkSlugs: [venice.id, munster.id],
      sourceSessionRef: session.id,
      reinforcingSessions: [],
      visibility: 'public',
    })
    console.log('Appended statement throughline')
  } else {
    console.log('Statement throughline already present — skip')
  }

  await payload.update({
    collection: 'artists',
    id: artist.id,
    data: {
      bioTimelineEntries: bios,
      statementThroughlines: throughlines,
    },
    overrideAccess: true,
  })

  console.log('Done.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
