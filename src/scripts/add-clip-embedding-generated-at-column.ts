/**
 * Add artworks.clip_embedding_generated_at after schema change.
 *
 * Usage: npx tsx src/scripts/add-clip-embedding-generated-at-column.ts
 *
 * Alternative: PAYLOAD_DATABASE_PUSH=true pnpm dev (once), then unset the env var.
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

async function main() {
  const payload = await getPayload({ config })
  const pool = getPgPool(payload)

  const { rows } = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'artworks'
       AND column_name = 'clip_embedding_generated_at'`,
  )

  if (rows.length > 0) {
    console.log('Column artworks.clip_embedding_generated_at already exists.')
    process.exit(0)
  }

  await pool.query(
    `ALTER TABLE "artworks"
     ADD COLUMN "clip_embedding_generated_at" timestamp(3) with time zone`,
  )

  console.log('Added artworks.clip_embedding_generated_at')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
