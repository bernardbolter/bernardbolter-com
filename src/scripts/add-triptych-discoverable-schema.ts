/**
 * Production-safe SQL: add triptychs.discoverable (checkbox, default true).
 *
 * Usage: npx tsx src/scripts/add-triptych-discoverable-schema.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })

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
       AND table_name = 'triptychs'
       AND column_name = 'discoverable'`,
  )

  if (rows.length > 0) {
    console.log('Column triptychs.discoverable already exists.')
    process.exit(0)
  }

  await pool.query(
    `ALTER TABLE "triptychs"
     ADD COLUMN "discoverable" boolean DEFAULT true`,
  )
  await pool.query(
    `UPDATE "triptychs" SET "discoverable" = true WHERE "discoverable" IS NULL`,
  )

  console.log('Added triptychs.discoverable')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
