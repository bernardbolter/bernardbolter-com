/**
 * Generate CLIP embeddings for dev fixture artworks (`__fixture-*` slugs).
 * Fixtures are draft records skipped by the main backfill and seed hooks.
 *
 * Usage: npx tsx src/scripts/embedFixtureArtworks.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

import { Pool } from 'pg'
import Replicate from 'replicate'

import { CLIP_EMBEDDING_DIMENSIONS } from '@/utilities/generateClipEmbedding'

const CLIP_MODEL = 'openai/clip'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function runClipWithRetry(replicate: Replicate, imageUrl: string) {
  for (let attempt = 1; attempt <= 8; attempt++) {
    try {
      return await replicate.run(CLIP_MODEL, { input: { image: imageUrl } })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (!message.includes('429') || attempt === 8) throw err
      const waitMs = 11_000
      console.warn(`  rate limited — waiting ${waitMs / 1000}s`)
      await sleep(waitMs)
    }
  }
  throw new Error('CLIP request failed after retries')
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set')
  }
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error('REPLICATE_API_TOKEN is not set')
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })

  const { rows: artworks } = await pool.query<{
    id: number
    slug: string
    image_url: string
  }>(`
    SELECT a.id, a.slug, m.url AS image_url
    FROM artworks a
    INNER JOIN media m ON m.id = a.primary_image_id
    WHERE a.slug LIKE '__fixture%'
      AND a.clip_embedding IS NULL
      AND m.url IS NOT NULL
    ORDER BY a.slug
  `)

  if (artworks.length === 0) {
    console.log('No fixture artworks need embeddings.')
    await pool.end()
    return
  }

  console.log(`Embedding ${artworks.length} fixture artwork(s)...`)

  for (const [index, artwork] of artworks.entries()) {
    const imageUrl = artwork.image_url.startsWith('http')
      ? artwork.image_url
      : `${(process.env.NEXT_PUBLIC_IMAGE_DOMAIN ?? '').replace(/\/$/, '')}/${artwork.image_url.replace(/^\//, '')}`

    if (index > 0) {
      await new Promise((resolve) => setTimeout(resolve, 11_000))
    }

    console.log(`${artwork.slug} — calling Replicate...`)
    const output = await runClipWithRetry(replicate, imageUrl)
    const embedding = (output as { embedding?: unknown }).embedding

    if (!Array.isArray(embedding) || embedding.length !== CLIP_EMBEDDING_DIMENSIONS) {
      throw new Error(`Unexpected embedding shape for ${artwork.slug}`)
    }

    await pool.query(
      `UPDATE artworks
       SET clip_embedding = $1::vector,
           clip_embedding_generated_at = $3
       WHERE id = $2`,
      [JSON.stringify(embedding), artwork.id, new Date().toISOString()],
    )
    console.log(`${artwork.slug} — saved`)
  }

  await pool.end()
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
