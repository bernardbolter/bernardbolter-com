/**
 * Backfill clip_embedding_generated_at for artworks that already have embeddings.
 *
 * Usage:
 *   npx tsx src/scripts/backfillClipEmbeddingGeneratedAt.ts
 *   npx tsx src/scripts/backfillClipEmbeddingGeneratedAt.ts --at "2026-06-18T17:36:00"
 *   npx tsx src/scripts/backfillClipEmbeddingGeneratedAt.ts --dry-run
 *
 * Default timestamp: 2026-06-18T17:36:00 (yesterday's batch run — override with --at).
 * Safe to re-run: only updates rows where clip_embedding IS NOT NULL
 * and clip_embedding_generated_at IS NULL.
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

import { Pool } from 'pg'

/** Default: batch backfill run on 18 June 2026 at 17:36 local wall time. */
const DEFAULT_GENERATED_AT = '2026-06-18T17:36:00'

function parseArgs() {
  const atIdx = process.argv.indexOf('--at')
  const at = atIdx >= 0 ? process.argv[atIdx + 1]?.trim() : undefined
  const dryRun = process.argv.includes('--dry-run')
  const generatedAt = at || DEFAULT_GENERATED_AT
  const parsed = new Date(generatedAt)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid --at timestamp: ${generatedAt}`)
  }
  return { generatedAt: parsed.toISOString(), dryRun }
}

async function main() {
  const { generatedAt, dryRun } = parseArgs()

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set')
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })

  const { rows: pending } = await pool.query<{ id: number; slug: string }>(
    `SELECT id, slug
     FROM artworks
     WHERE clip_embedding IS NOT NULL
       AND clip_embedding_generated_at IS NULL
     ORDER BY id`,
  )

  console.log(
    `Found ${pending.length} artwork(s) with embeddings missing generated-at.${dryRun ? ' (dry run)' : ''}`,
  )
  console.log(`Timestamp to apply: ${generatedAt}\n`)

  if (dryRun) {
    pending.forEach((row, index) => console.log(`  [${index + 1}] ${row.slug} (id ${row.id})`))
    await pool.end()
    return
  }

  if (pending.length === 0) {
    await pool.end()
    return
  }

  const { rowCount } = await pool.query(
    `UPDATE artworks
     SET clip_embedding_generated_at = $1
     WHERE clip_embedding IS NOT NULL
       AND clip_embedding_generated_at IS NULL`,
    [generatedAt],
  )

  console.log(`Updated ${rowCount ?? pending.length} artwork(s).`)
  await pool.end()
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
