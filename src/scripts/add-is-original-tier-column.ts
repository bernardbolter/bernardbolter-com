/**
 * Add ownershipRegistry.isOriginalTier to Postgres after schema change.
 *
 * Usage: npx tsx src/scripts/add-is-original-tier-column.ts
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
       AND table_name = 'artworks_ownership_registry'
       AND column_name = 'is_original_tier'`,
  )

  if (rows.length > 0) {
    console.log('Column artworks_ownership_registry.is_original_tier already exists.')
    process.exit(0)
  }

  await pool.query(
    `ALTER TABLE "artworks_ownership_registry"
     ADD COLUMN "is_original_tier" boolean DEFAULT false NOT NULL`,
  )

  console.log('Added artworks_ownership_registry.is_original_tier')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
