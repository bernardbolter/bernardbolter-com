/**
 * Production-safe SQL migration: add `unknown` to
 * enum_artworks_current_location_category (confirmed-unknown / unlocated).
 *
 * Do NOT use Payload Drizzle push on Netcup for this.
 *
 * Usage (on Netcup, after git pull):
 *   npx tsx src/scripts/add-current-location-unknown-enum.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })

import { getPayload } from 'payload'
import config from '@/payload.config'

type PgPool = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
}

const ENUM_NAME = 'enum_artworks_current_location_category'
const VALUE = 'unknown'

function getPgPool(payload: Awaited<ReturnType<typeof getPayload>>): PgPool {
  const pool = (payload.db as { pool?: PgPool } | undefined)?.pool
  if (!pool) throw new Error('Postgres pool not available on payload.db')
  return pool
}

async function enumValueExists(pool: PgPool, enumName: string, value: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1
     FROM pg_type t
     JOIN pg_enum e ON t.oid = e.enumtypid
     WHERE t.typname = $1 AND e.enumlabel = $2`,
    [enumName, value],
  )
  return rows.length > 0
}

async function main() {
  const payload = await getPayload({ config })
  const pool = getPgPool(payload)

  if (await enumValueExists(pool, ENUM_NAME, VALUE)) {
    console.log(`${ENUM_NAME} already includes '${VALUE}' — nothing to do.`)
  } else {
    await pool.query(`ALTER TYPE "public"."${ENUM_NAME}" ADD VALUE '${VALUE}'`)
    console.log(`Added '${VALUE}' to ${ENUM_NAME}`)
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
