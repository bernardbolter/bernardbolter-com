/**
 * Reasoning-text embedding backfill — OpenAI-compatible endpoint.
 *
 * Usage:
 *   npx tsx src/scripts/backfillReasoningTextEmbeddings.ts --dry-run
 *   npx tsx src/scripts/backfillReasoningTextEmbeddings.ts --limit 1
 *   npx tsx src/scripts/backfillReasoningTextEmbeddings.ts
 *
 * Env:
 *   DATABASE_URL
 *   REASONING_TEXT_EMBEDDING_URL   (required unless --dry-run)
 *   REASONING_TEXT_EMBEDDING_API_KEY (optional)
 *   REASONING_TEXT_EMBEDDING_MODEL  (optional, default text-embedding-3-small)
 *
 * Safe to re-run: only rows where reasoning_text_embedding IS NULL.
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })

import { getPayload } from 'payload'
import config from '@payload-config'

import { resolveReasoningEmbeddingSource } from '@/lib/artwork/reasoningEmbeddingSource'
import { getPool } from '@/lib/payload/getPool'
import { generateReasoningTextEmbedding } from '@/utilities/generateReasoningTextEmbedding'
import { persistArtworkReasoningEmbedding } from '@/utilities/persistArtworkReasoningEmbedding'
import type { Artwork } from '@/payload-types'

const DEFAULT_DELAY_MS = 250

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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

async function main() {
  const { limit, delayMs, dryRun } = parseArgs()

  if (!dryRun && !process.env.REASONING_TEXT_EMBEDDING_URL) {
    throw new Error('REASONING_TEXT_EMBEDDING_URL is required (or pass --dry-run)')
  }

  const payload = await getPayload({ config })
  const pool = getPool(payload)

  const { rows: nullRows } = await pool.query<{ id: string }>(
    `SELECT id
     FROM artworks
     WHERE reasoning_text_embedding IS NULL
     ORDER BY id ASC
     ${limit ? `LIMIT ${limit}` : ''}`,
  )

  console.log(
    `Reasoning-text backfill: ${nullRows.length} candidate(s) with NULL embedding${
      dryRun ? ' [dry-run]' : ''
    }`,
  )

  let eligible = 0
  let written = 0
  let skipped = 0

  for (const row of nullRows) {
    const id = Number(row.id)
    const artwork = (await payload.findByID({
      collection: 'artworks',
      id,
      depth: 0,
      overrideAccess: true,
    })) as Artwork

    const source = resolveReasoningEmbeddingSource(artwork)
    if (!source) {
      skipped += 1
      console.log(`  skip id=${id} slug=${artwork.slug ?? '?'} (no eligible source text)`)
      continue
    }

    eligible += 1
    console.log(
      `  ${dryRun ? 'would write' : 'write'} id=${id} slug=${artwork.slug ?? '?'} source=${source.sourceType} chars=${source.sourceText.length}`,
    )

    if (dryRun) continue

    const embedding = await generateReasoningTextEmbedding(source.sourceText)
    await persistArtworkReasoningEmbedding(payload, id, embedding, source.sourceType)
    written += 1
    if (delayMs > 0) await sleep(delayMs)
  }

  console.log(
    `Done. eligible=${eligible} written=${written} skippedNoSource=${skipped} dryRun=${dryRun}`,
  )
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
