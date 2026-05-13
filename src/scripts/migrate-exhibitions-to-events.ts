/**
 * One-off migration helper: map legacy `artworks.exhibitions` → `exhibitionHistory` + `events`.
 * Run manually after review: `pnpm tsx src/scripts/migrate-exhibitions-to-events.ts`
 *
 * This script is conservative — it only creates Event stubs when missing and
 * appends `exhibitionHistory` rows; it does not delete legacy `exhibitions` links.
 */
import { getPayload } from 'payload'

import config from '@payload-config'

async function main() {
  const payload = await getPayload({ config })
  const artworks = await payload.find({
    collection: 'artworks',
    limit: 500,
    depth: 1,
    overrideAccess: true,
  })

  for (const aw of artworks.docs) {
    const legacy = aw.exhibitions
    if (!Array.isArray(legacy) || legacy.length === 0) continue
    const history = Array.isArray(aw.exhibitionHistory) ? [...aw.exhibitionHistory] : []

    for (const ex of legacy) {
      const exDoc = typeof ex === 'object' && ex && 'id' in ex ? ex : null
      if (!exDoc) continue
      const title = 'title' in exDoc && typeof exDoc.title === 'string' ? exDoc.title : 'Exhibition'
      const slugBase =
        'slug' in exDoc && typeof exDoc.slug === 'string' ?
          exDoc.slug
        : `legacy-exhibition-${exDoc.id}`

      const existingEvent = await payload.find({
        collection: 'events',
        where: { slug: { equals: slugBase } },
        limit: 1,
        overrideAccess: true,
      })

      let eventId: number
      if (existingEvent.docs[0]) {
        eventId = existingEvent.docs[0].id
      } else {
        const created = await payload.create({
          collection: 'events',
          data: {
            title,
            slug: slugBase,
            eventType: 'group-exhibition',
            status: 'published',
            startDate: new Date().toISOString(),
            sourceHistory: [
              {
                source: 'artist-archive',
                actorId: String(aw.id),
                addedAt: new Date().toISOString(),
                fieldsContributed: [{ field: 'title' }],
              },
            ],
          },
          overrideAccess: true,
        })
        eventId = created.id
      }

      if (!history.some((h) => typeof h.event === 'object' && h.event && 'id' in h.event && h.event.id === eventId)) {
        history.push({
          event: eventId,
          workIncluded: true,
          notes: 'Migrated from legacy exhibitions relation',
        })
      }
    }

    await payload.update({
      collection: 'artworks',
      id: aw.id,
      data: { exhibitionHistory: history },
      overrideAccess: true,
    })
    console.log('updated artwork', aw.id)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
