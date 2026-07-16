/**
 * DINOv2 Large embedding backfill via Replicate.
 *
 * Safe to re-run: only processes artworks where dinov2_embedding IS NULL.
 * Never overwrites an existing vector. Upserts embeddings[] metadata when missing.
 *
 * Usage:
 *   npx tsx src/scripts/backfillDinov2Embeddings.ts --dry-run
 *   npx tsx src/scripts/backfillDinov2Embeddings.ts --limit 1
 *
 * Env:
 *   DATABASE_URL, REPLICATE_API_TOKEN
 *   DINOV2_REPLICATE_MODEL (optional) — default lucataco/dinov2
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

import { Pool } from 'pg'
import Replicate from 'replicate'

import { DINOV2_EMBEDDING_METADATA } from '@/lib/artwork/visionPage'
import { DINOV2_EMBEDDING_DIMENSIONS } from '@/utilities/generateDinov2Embedding'

const DEFAULT_MODEL = process.env.DINOV2_REPLICATE_MODEL || 'lucataco/dinov2'
const DEFAULT_DELAY_MS = 11_000
const MAX_RETRIES = 8

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRateLimitError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err)
  return message.includes('429') || message.toLowerCase().includes('throttled')
}

function parseRetryAfterMs(err: unknown): number {
  const message = err instanceof Error ? err.message : String(err)
  const jsonMatch = message.match(/"retry_after"\s*:\s*(\d+(?:\.\d+)?)/)
  if (jsonMatch) {
    return Math.ceil(Number.parseFloat(jsonMatch[1]!) * 1000) + 500
  }
  return DEFAULT_DELAY_MS
}

function extractEmbedding(output: unknown): number[] {
  if (Array.isArray(output) && output.every((n) => typeof n === 'number')) {
    return output as number[]
  }
  if (output && typeof output === 'object') {
    const record = output as Record<string, unknown>
    for (const key of ['embedding', 'embeddings', 'vector', 'features']) {
      const value = record[key]
      if (Array.isArray(value) && value.every((n) => typeof n === 'number')) {
        return value as number[]
      }
      if (Array.isArray(value) && Array.isArray(value[0])) {
        const first = value[0] as unknown[]
        if (first.every((n) => typeof n === 'number')) return first as number[]
      }
    }
  }
  throw new Error(`Unexpected DINOv2 output shape: ${typeof output}`)
}

async function runDinov2WithRetry(
  replicate: Replicate,
  imageUrl: string,
): Promise<{ embedding: number[] }> {
  let lastError: unknown
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const output = await replicate.run(DEFAULT_MODEL as `${string}/${string}`, {
        input: { image: imageUrl },
      })
      const embedding = extractEmbedding(output)
      if (embedding.length !== DINOV2_EMBEDDING_DIMENSIONS) {
        throw new Error(
          `Unexpected embedding shape: got ${embedding.length} values, expected ${DINOV2_EMBEDDING_DIMENSIONS}`,
        )
      }
      return { embedding }
    } catch (err) {
      lastError = err
      if (!isRateLimitError(err) || attempt === MAX_RETRIES) throw err
      const waitMs = parseRetryAfterMs(err)
      console.warn(
        `  rate limited — waiting ${Math.round(waitMs / 1000)}s (attempt ${attempt}/${MAX_RETRIES})`,
      )
      await sleep(waitMs)
    }
  }
  throw lastError
}

function parseArgs() {
  const limitIdx = process.argv.indexOf('--limit')
  const limit = limitIdx >= 0 ? Number.parseInt(process.argv[limitIdx + 1] ?? '', 10) : undefined
  const delayIdx = process.argv.indexOf('--delay-ms')
  const delayMs =
    delayIdx >= 0 ? Number.parseInt(process.argv[delayIdx + 1] ?? '', 10) : DEFAULT_DELAY_MS
  const dryRun = process.argv.includes('--dry-run')
  return {
    limit: Number.isFinite(limit) && (limit as number) > 0 ? limit : undefined,
    delayMs: Number.isFinite(delayMs) && (delayMs as number) >= 0 ? delayMs : DEFAULT_DELAY_MS,
    dryRun,
  }
}

async function upsertDinov2Metadata(pool: Pool, artworkId: number, generatedAt: string) {
  const { rows } = await pool.query<{
    id: number
    _parent_id: number
    model: string
  }>(
    `SELECT id, _parent_id, model
     FROM artworks_embeddings
     WHERE _parent_id = $1 AND model = $2
     LIMIT 1`,
    [artworkId, DINOV2_EMBEDDING_METADATA.model],
  )

  if (rows.length > 0) return

  const { rows: orderRows } = await pool.query<{ max: number | null }>(
    `SELECT MAX(_order) AS max FROM artworks_embeddings WHERE _parent_id = $1`,
    [artworkId],
  )
  const nextOrder = (orderRows[0]?.max ?? -1) + 1

  await pool.query(
    `INSERT INTO artworks_embeddings
      (_order, _parent_id, model, dimensions, pg_vector_column, generated_date, spec_url, short_description)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      nextOrder,
      artworkId,
      DINOV2_EMBEDDING_METADATA.model,
      DINOV2_EMBEDDING_METADATA.dimensions,
      DINOV2_EMBEDDING_METADATA.pgVectorColumn,
      generatedAt,
      DINOV2_EMBEDDING_METADATA.specUrl,
      DINOV2_EMBEDDING_METADATA.shortDescription,
    ],
  )
}

async function main() {
  const { limit, delayMs, dryRun } = parseArgs()

  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set')
  if (!dryRun && !process.env.REPLICATE_API_TOKEN) {
    throw new Error('REPLICATE_API_TOKEN is not set')
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })

  console.log(`Querying artworks needing DINOv2 embeddings (model=${DEFAULT_MODEL})...`)

  const { rows: artworks } = await pool.query<{
    id: number
    slug: string
    image_url: string
  }>(
    `
    SELECT a.id, a.slug, m.url AS image_url
    FROM artworks a
    INNER JOIN media m ON m.id = a.primary_image_id
    WHERE a.status = 'published'
      AND a.dinov2_embedding IS NULL
      AND m.url IS NOT NULL
    ORDER BY a.id
    ${limit ? 'LIMIT $1' : ''}
    `,
    limit ? [limit] : [],
  )

  console.log(`Found ${artworks.length} artworks to process.${dryRun ? ' (dry run)' : ''}`)
  if (dryRun) {
    artworks.forEach((a, i) => console.log(`  [${i + 1}] ${a.slug} — ${a.image_url}`))
    await pool.end()
    return
  }

  let succeeded = 0
  const failed: { slug: string; error: string }[] = []

  for (const [index, artwork] of artworks.entries()) {
    const progress = `[${index + 1}/${artworks.length}]`
    try {
      console.log(`${progress} ${artwork.slug} — calling Replicate...`)
      const { embedding } = await runDinov2WithRetry(replicate, artwork.image_url)
      const generatedAt = new Date().toISOString()

      // NULL-only write — never overwrite if another process filled the column.
      const result = await pool.query(
        `UPDATE artworks
         SET dinov2_embedding = $1::vector,
             dinov2_embedding_generated_at = $3
         WHERE id = $2 AND dinov2_embedding IS NULL`,
        [JSON.stringify(embedding), artwork.id, generatedAt],
      )

      if (result.rowCount === 0) {
        console.log(`${progress} ${artwork.slug} — skipped (already filled)`)
      } else {
        try {
          await upsertDinov2Metadata(pool, artwork.id, generatedAt)
        } catch (metaErr) {
          console.warn(
            `${progress} ${artwork.slug} — vector saved; metadata upsert skipped:`,
            metaErr instanceof Error ? metaErr.message : metaErr,
          )
        }
        console.log(`${progress} ${artwork.slug} — saved`)
        succeeded++
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`${progress} ${artwork.slug} — FAILED: ${message}`)
      failed.push({ slug: artwork.slug, error: message })
    }

    if (index < artworks.length - 1) await sleep(delayMs)
  }

  console.log('\n--- Summary ---')
  console.log(`Succeeded: ${succeeded}`)
  console.log(`Failed: ${failed.length}`)
  failed.forEach((f) => console.log(`  - ${f.slug}: ${f.error}`))
  await pool.end()
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
