/**
 * Populate artworks.embeddings metadata for rows that already have clip_embedding vectors.
 *
 * Usage: npx tsx src/scripts/migrate-embeddings-metadata.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })

import { getPayload } from 'payload'
import config from '@/payload.config'

import { CLIP_EMBEDDING_METADATA } from '@/lib/artwork/visionPage'
import { getPool } from '@/lib/payload/getPool'

type PgRow = {
  id: number
  clip_embedding_generated_at: string | Date | null
}

async function main() {
  const payload = await getPayload({ config })
  const pool = getPool(payload)

  const { rows } = await pool.query<PgRow>(
    `SELECT id, clip_embedding_generated_at
     FROM artworks
     WHERE clip_embedding IS NOT NULL`,
  )

  console.log(`Found ${rows.length} artwork(s) with CLIP embeddings.`)

  let updated = 0
  let skipped = 0

  for (const row of rows) {
    const artwork = await payload.findByID({
      collection: 'artworks',
      id: row.id,
      depth: 0,
      overrideAccess: true,
    })

    const existing = artwork.embeddings ?? []
    const hasClipEntry = existing.some(
      (entry) =>
        entry?.model === CLIP_EMBEDDING_METADATA.model ||
        entry?.pgVectorColumn === CLIP_EMBEDDING_METADATA.pgVectorColumn,
    )

    if (hasClipEntry) {
      skipped += 1
      continue
    }

    const generatedAtRaw = row.clip_embedding_generated_at
    const generatedDate =
      generatedAtRaw instanceof Date
        ? generatedAtRaw.toISOString()
        : typeof generatedAtRaw === 'string' && generatedAtRaw.trim()
          ? generatedAtRaw.trim()
          : undefined

    await payload.update({
      collection: 'artworks',
      id: row.id,
      data: {
        embeddings: [
          ...existing,
          {
            model: CLIP_EMBEDDING_METADATA.model,
            dimensions: CLIP_EMBEDDING_METADATA.dimensions,
            pgVectorColumn: CLIP_EMBEDDING_METADATA.pgVectorColumn,
            specUrl: CLIP_EMBEDDING_METADATA.specUrl,
            shortDescription: CLIP_EMBEDDING_METADATA.shortDescription,
            ...(generatedDate ? { generatedDate } : {}),
          },
        ],
      },
      context: { skipEmbedding: true },
      overrideAccess: true,
    })

    updated += 1
  }

  console.log(`Updated ${updated} artwork(s). Skipped ${skipped} already migrated.`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
