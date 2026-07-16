/**
 * One-time CLIP embedding backfill via Replicate (openai/clip).
 *
 * Usage:
 *   npx tsx src/scripts/backfillClipEmbeddings.ts              # full run
 *   npx tsx src/scripts/backfillClipEmbeddings.ts --limit 1    # smoke test
 *   npx tsx src/scripts/backfillClipEmbeddings.ts --dry-run    # list only
 *
 *   npx tsx src/scripts/backfillClipEmbeddings.ts --delay-ms 11000  # low-credit Replicate account
 *
 * Safe to re-run: skips artworks where clip_embedding IS NOT NULL.
 *
 * Replicate accounts with < $5 credit: 6 predictions/min, burst 1 — use default delay (11s).
 * Add billing credit at replicate.com/account/billing for higher throughput.
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

import { Pool } from 'pg'
import Replicate from 'replicate'

import { CLIP_EMBEDDING_DIMENSIONS } from '@/utilities/generateClipEmbedding'

const CLIP_MODEL = 'openai/clip'
/** 6 req/min with burst 1 when Replicate balance is under $5. */
const DEFAULT_DELAY_MS = 11_000
const MAX_RETRIES = 8

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRateLimitError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err)
  return message.includes('429') || message.toLowerCase().includes('throttled')
}

/** Parse `retry_after` seconds from Replicate 429 error bodies. */
function parseRetryAfterMs(err: unknown): number {
  const message = err instanceof Error ? err.message : String(err)
  const jsonMatch = message.match(/"retry_after"\s*:\s*(\d+(?:\.\d+)?)/)
  if (jsonMatch) {
    return Math.ceil(Number.parseFloat(jsonMatch[1]!) * 1000) + 500
  }
  const textMatch = message.match(/resets in ~(\d+)s/i)
  if (textMatch) {
    return Number.parseInt(textMatch[1]!, 10) * 1000 + 1000
  }
  return DEFAULT_DELAY_MS
}

async function runClipWithRetry(
  replicate: Replicate,
  imageUrl: string,
): Promise<{ embedding: number[] }> {
  let lastError: unknown
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const output = await replicate.run(CLIP_MODEL, {
        input: { image: imageUrl },
      })
      const embedding = (output as { embedding?: unknown }).embedding
      if (!Array.isArray(embedding) || embedding.length !== CLIP_EMBEDDING_DIMENSIONS) {
        throw new Error(
          `Unexpected embedding shape: got ${
            Array.isArray(embedding) ? embedding.length : typeof embedding
          } values, expected ${CLIP_EMBEDDING_DIMENSIONS}`,
        )
      }
      return { embedding }
    } catch (err) {
      lastError = err
      if (!isRateLimitError(err) || attempt === MAX_RETRIES) {
        throw err
      }
      const waitMs = parseRetryAfterMs(err)
      console.warn(`  rate limited — waiting ${Math.round(waitMs / 1000)}s (attempt ${attempt}/${MAX_RETRIES})`)
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
    limit: Number.isFinite(limit) && limit! > 0 ? limit : undefined,
    delayMs: Number.isFinite(delayMs) && delayMs >= 0 ? delayMs : DEFAULT_DELAY_MS,
    dryRun,
  }
}

async function main() {
  const { limit, delayMs, dryRun } = parseArgs()

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set')
  }
  if (!dryRun && !process.env.REPLICATE_API_TOKEN) {
    throw new Error('REPLICATE_API_TOKEN is not set')
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })

  console.log('Querying artworks needing CLIP embeddings...')

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
      AND a.clip_embedding IS NULL
      AND m.url IS NOT NULL
    ORDER BY a.id
    ${limit ? 'LIMIT $1' : ''}
    `,
    limit ? [limit] : [],
  )

  console.log(`Found ${artworks.length} artworks to process.${dryRun ? ' (dry run)' : ''}`)
  if (!dryRun) {
    const etaMin = Math.ceil((artworks.length * delayMs) / 60_000)
    console.log(`Delay between calls: ${delayMs}ms (~${etaMin} min ETA for this batch)\n`)
  } else {
    console.log()
  }

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

      const { embedding } = await runClipWithRetry(replicate, artwork.image_url)

      await pool.query(
        `UPDATE artworks
         SET clip_embedding = $1::vector,
             clip_embedding_generated_at = $3
         WHERE id = $2 AND clip_embedding IS NULL`,
        [JSON.stringify(embedding), artwork.id, new Date().toISOString()],
      )

      console.log(`${progress} ${artwork.slug} — saved`)
      succeeded++
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`${progress} ${artwork.slug} — FAILED: ${message}`)
      failed.push({ slug: artwork.slug, error: message })
    }

    if (index < artworks.length - 1) {
      await sleep(delayMs)
    }
  }

  console.log('\n--- Summary ---')
  console.log(`Total processed: ${artworks.length}`)
  console.log(`Succeeded: ${succeeded}`)
  console.log(`Failed: ${failed.length}`)
  if (failed.length > 0) {
    console.log('\nFailed artworks:')
    failed.forEach((f) => console.log(`  - ${f.slug}: ${f.error}`))
  }

  await pool.end()
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
