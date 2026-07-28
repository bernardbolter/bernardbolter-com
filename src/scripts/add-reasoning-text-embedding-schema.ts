/**
 * Add reasoning-text embedding columns on artworks (additive only).
 *
 * Usage: npx tsx src/scripts/add-reasoning-text-embedding-schema.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

import { getPayload } from 'payload'
import config from '@/payload.config'

type PgPool = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
}

function getPgPool(payload: Awaited<ReturnType<typeof getPayload>>): PgPool {
  const pool = (payload.db as { pool?: PgPool } | undefined)?.pool
  if (!pool) throw new Error('Postgres pool not available on payload.db')
  return pool
}

async function columnExists(pool: PgPool, columnName: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'artworks'
       AND column_name = $1`,
    [columnName],
  )
  return rows.length > 0
}

async function main() {
  const payload = await getPayload({ config })
  const pool = getPgPool(payload)

  // Ensure enum / select values exist for source field (text is fine if Payload uses varchar)
  if (!(await columnExists(pool, 'reasoning_text_embedding'))) {
    await pool.query(
      `ALTER TABLE "artworks"
       ADD COLUMN "reasoning_text_embedding" vector(1536)`,
    )
    console.log('Added artworks.reasoning_text_embedding vector(1536)')
  } else {
    console.log('Column artworks.reasoning_text_embedding already exists.')
  }

  if (!(await columnExists(pool, 'reasoning_text_embedding_generated_at'))) {
    await pool.query(
      `ALTER TABLE "artworks"
       ADD COLUMN "reasoning_text_embedding_generated_at" timestamp(3) with time zone`,
    )
    console.log('Added artworks.reasoning_text_embedding_generated_at')
  } else {
    console.log('Column artworks.reasoning_text_embedding_generated_at already exists.')
  }

  if (!(await columnExists(pool, 'reasoning_text_embedding_source'))) {
    await pool.query(
      `ALTER TABLE "artworks"
       ADD COLUMN "reasoning_text_embedding_source" varchar`,
    )
    console.log('Added artworks.reasoning_text_embedding_source')
  } else {
    console.log('Column artworks.reasoning_text_embedding_source already exists.')
  }

  // Extend embeddings.model enum if Postgres enum is used
  try {
    await pool.query(
      `ALTER TYPE "enum_artworks_embeddings_model"
       ADD VALUE IF NOT EXISTS 'text-embedding-3-small'`,
    )
    console.log('Ensured embeddings.model enum includes text-embedding-3-small')
  } catch (err) {
    console.log(
      'embeddings.model enum update skipped/not needed:',
      err instanceof Error ? err.message : err,
    )
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
