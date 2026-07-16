/**
 * CLIP embedding backfill — prefers local sidecar (CLIP_EMBEDDING_URL).
 *
 * Usage:
 *   npx tsx src/scripts/backfillClipEmbeddings.ts --dry-run
 *   npx tsx src/scripts/backfillClipEmbeddings.ts --limit 1
 *   npx tsx src/scripts/backfillClipEmbeddings.ts              # full NULL-only run
 *
 * Env:
 *   DATABASE_URL
 *   CLIP_EMBEDDING_URL=http://127.0.0.1:2030/v1/embed/clip   (preferred)
 *   REPLICATE_API_TOKEN + --replicate                          (fallback)
 *
 * Safe to re-run: only rows where clip_embedding IS NULL.
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })

import { Pool } from 'pg'
import Replicate from 'replicate'

import {
  CLIP_EMBEDDING_DIMENSIONS,
  generateClipEmbedding,
} from '@/utilities/generateClipEmbedding'

const CLIP_MODEL = 'openai/clip'
const DEFAULT_DELAY_MS = process.env.CLIP_EMBEDDING_URL ? 500 : 11_000
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

async function runClipReplicate(
  replicate: Replicate,
  imageUrl: string,
): Promise<number[]> {
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
      return embedding as number[]
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
  const useReplicate = process.argv.includes('--replicate')
  return {
    limit: Number.isFinite(limit) && (limit as number) > 0 ? limit : undefined,
    delayMs: Number.isFinite(delayMs) && (delayMs as number) >= 0 ? delayMs : DEFAULT_DELAY_MS,
    dryRun,
    useReplicate,
  }
}

async function main() {
  const { limit, delayMs, dryRun, useReplicate } = parseArgs()
  const localUrl = process.env.CLIP_EMBEDDING_URL?.trim()
  const mode = useReplicate || !localUrl ? 'replicate' : 'local'

  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set')
  if (mode === 'local' && !localUrl) throw new Error('CLIP_EMBEDDING_URL is not set')
  if (mode === 'replicate' && !dryRun && !process.env.REPLICATE_API_TOKEN) {
    throw new Error('REPLICATE_API_TOKEN is not set (or set CLIP_EMBEDDING_URL for local)')
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })
  const replicate =
    mode === 'replicate' && !dryRun
      ? new Replicate({ auth: process.env.REPLICATE_API_TOKEN })
      : null

  console.log(`CLIP backfill mode=${mode}${localUrl ? ` url=${localUrl}` : ''}`)

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
  if (dryRun) {
    artworks.forEach((a, i) => console.log(`  [${i + 1}] ${a.slug}`))
    await pool.end()
    process.exit(0)
  }

  let succeeded = 0
  const failed: { slug: string; error: string }[] = []

  for (const [index, artwork] of artworks.entries()) {
    const progress = `[${index + 1}/${artworks.length}]`
    try {
      console.log(`${progress} ${artwork.slug}…`)
      const embedding =
        mode === 'local'
          ? await generateClipEmbedding(artwork.image_url)
          : await runClipReplicate(replicate!, artwork.image_url)

      const result = await pool.query(
        `UPDATE artworks
         SET clip_embedding = $1::vector,
             clip_embedding_generated_at = $3
         WHERE id = $2 AND clip_embedding IS NULL`,
        [JSON.stringify(embedding), artwork.id, new Date().toISOString()],
      )
      if ((result.rowCount ?? 0) === 0) {
        console.log(`${progress} ${artwork.slug} — skipped (already filled)`)
      } else {
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
  process.exit(failed.length ? 1 : 0)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
