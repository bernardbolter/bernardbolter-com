/**
 * Confirm ArtSpan Event.artworks[] ↔ Artworks.events join, and session transcript lengths.
 * Usage: npx tsx src/scripts/verify-artspan-artwork-event-join.ts
 */
import { getPayload } from 'payload'
import config from '@payload-config'

async function main() {
  const payload = await getPayload({ config })

  const eventResult = await payload.find({
    collection: 'events',
    where: { slug: { equals: 'artspan-selections-2017-heron-arts' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    select: { slug: true, artworks: true },
  })
  const event = eventResult.docs[0]
  if (!event) {
    console.error('ArtSpan event not found')
    process.exit(1)
  }

  const artworkIds = (event.artworks ?? []).map((entry) =>
    typeof entry === 'number' ? entry : entry?.id,
  )
  console.log('EVENT artworks[] IDs:', artworkIds)

  for (const slug of ['lombard-street-1922-v2', 'baker-beach-1935'] as const) {
    // depth:1 required — join docs at depth 0 arrive without id/slug populated
    const artworkResult = await payload.find({
      collection: 'artworks',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 1,
      overrideAccess: true,
    })
    const artwork = artworkResult.docs[0]
    if (!artwork) {
      console.error(`Artwork ${slug} not found`)
      continue
    }
    const join = artwork.events
    const docs =
      join && typeof join === 'object' && 'docs' in join ?
        (join as { docs: Array<{ id: number; slug?: string } | number> }).docs
      : null
    const matched = (docs ?? []).some((d) => {
      if (typeof d === 'number') return d === event.id
      return d.id === event.id || d.slug === 'artspan-selections-2017-heron-arts'
    })
    console.log(
      `ARTWORK ${slug} id=${artwork.id} events.docs=${docs?.length ?? 'n/a'} includes ArtSpan=${matched}`,
      docs?.map((d) => (typeof d === 'number' ? d : { id: d.id, slug: d.slug })),
    )
  }

  for (const sid of [
    'pecha-kucha-amsterdam-vol-9-mediamatic-2009-event-2026-07-31',
    'artspan-selections-2017-heron-arts-event-2026-07-31',
  ] as const) {
    const sessionResult = await payload.find({
      collection: 'sessions',
      where: { sessionId: { equals: sid } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      select: {
        sessionId: true,
        messages: true,
        sessionType: true,
        status: true,
        agentModel: true,
        isExemplar: true,
        eventRecord: true,
      },
    })
    const session = sessionResult.docs[0]
    const turns = Array.isArray(session?.messages) ? session.messages.length : 0
    console.log(
      `SESSION ${sid}: type=${session?.sessionType} status=${session?.status} turns=${turns} agentModel=${session?.agentModel} isExemplar=${session?.isExemplar}`,
    )
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
