/**
 * Inventory collector-visible ownership for the open-business brief.
 * Run: npx tsx src/scripts/listVisibleOwnershipAttribution.ts
 */
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

import { getPayload } from 'payload'
import config from '@/payload.config'

type Row = Record<string, unknown>

async function main() {
  const payload = await getPayload({ config })
  const pageSize = 100
  let page = 1
  let hasNext = true
  const rows: Row[] = []

  while (hasNext) {
    const result = await payload.find({
      collection: 'artworks',
      where: { status: { equals: 'published' } },
      limit: pageSize,
      page,
      depth: 1,
      overrideAccess: true,
      select: {
        slug: true,
        title: true,
        ownershipHistory: true,
        currentLocation: true,
        ownershipRegistry: true,
      },
    })

    for (const doc of result.docs) {
      for (const row of doc.ownershipHistory ?? []) {
        if (!row || typeof row !== 'object') continue
        if (row.collectorVisible !== true) continue
        const place = row.place && typeof row.place === 'object' ? row.place : null
        const actorName =
          row.actor && typeof row.actor === 'object'
            ? (row.actor as { name?: string | null }).name
            : null
        rows.push({
          surface: 'ownershipHistory',
          slug: doc.slug,
          title: doc.title,
          displayName: row.displayName || actorName || null,
          city: place?.city || (row as { city?: string }).city || null,
          country: place?.country || null,
          dateAcquired: row.dateAcquired || null,
          claimStatus: row.claimStatus || null,
          locationCategory: doc.currentLocation?.category || null,
          locationDetail: doc.currentLocation?.locationDetail || null,
        })
      }

      for (const tier of doc.ownershipRegistry ?? []) {
        if (!tier || typeof tier !== 'object') continue
        for (const copy of tier.copies ?? []) {
          if (!copy || typeof copy !== 'object') continue
          if (copy.collectorVisible !== true) continue
          if (!copy.owner?.trim()) continue
          rows.push({
            surface: 'ownershipRegistry.copy',
            slug: doc.slug,
            title: doc.title,
            tierLabel: tier.tierLabel,
            copyNumber: copy.copyNumber,
            owner: copy.owner,
            claimStatus: copy.claimStatus,
          })
        }
      }
    }

    hasNext = result.hasNextPage
    page += 1
  }

  console.log(JSON.stringify({ count: rows.length, rows }, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
