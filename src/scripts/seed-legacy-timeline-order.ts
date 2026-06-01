/**
 * Seed provisional sortIndex from legacy WP post dates (hand ordering).
 * Matches artworks by wp_id → legacy databaseId. Does not overwrite yearCreated.
 *
 * Usage: npx tsx src/scripts/seed-legacy-timeline-order.ts [--dry-run]
 * Then: POST /api/art-official/recompute-timeline
 */
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { getPayload } from 'payload'
import config from '@/payload.config'
import { loadLegacyDump } from '@/lib/artOfficial/legacyDump'

const dryRun = process.argv.includes('--dry-run')

async function main() {
  const payload = await getPayload({ config })
  const nodes = loadLegacyDump()
  if (nodes.length === 0) {
    console.error('No legacy dump — run export-wp-legacy-artworks.ts first.')
    process.exit(1)
  }

  const sorted = [...nodes].sort((a, b) => {
    const da = a.date ? Date.parse(a.date) : 0
    const db = b.date ? Date.parse(b.date) : 0
    return da - db
  })

  const sortIndexByWpId = new Map<number, number>()
  sorted.forEach((node, index) => {
    if (node.databaseId != null) {
      sortIndexByWpId.set(node.databaseId, index * 10)
    }
  })

  const { docs } = await payload.find({
    collection: 'artworks',
    where: { wp_id: { exists: true } },
    limit: 500,
    depth: 0,
    overrideAccess: true,
  })

  let updated = 0
  for (const doc of docs) {
    const wpId = doc.wp_id
    if (wpId == null) continue
    const sortIndex = sortIndexByWpId.get(wpId)
    if (sortIndex == null) continue

    const data: Record<string, unknown> = { sortIndex }
    if (!doc.datePrecision) {
      data.datePrecision = 'year'
    }

    if (dryRun) {
      console.log(`[dry-run] artworks/${doc.id} wp_id=${wpId} sortIndex=${sortIndex}`)
    } else {
      await payload.update({
        collection: 'artworks',
        id: doc.id,
        data: data as never,
        overrideAccess: true,
        context: { skipHooks: true },
      })
    }
    updated += 1
  }

  console.log(
    dryRun
      ? `Would update ${updated} artworks with provisional sortIndex.`
      : `Updated ${updated} artworks. Run POST /api/art-official/recompute-timeline next.`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
