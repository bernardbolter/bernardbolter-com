/**
 * Ensure pgvector extension exists in Neon/Postgres.
 *
 * Run with:
 *   npx tsx src/scripts/enable-pgvector.ts
 */
import { getPayload } from 'payload'
import type { Pool } from 'pg'

import config from '@payload-config'

function getPool(payload: Awaited<ReturnType<typeof getPayload>>): Pool {
  const pool = (payload.db as unknown as { pool?: Pool }).pool
  if (!pool) {
    throw new Error('Postgres pool is not available on payload.db')
  }
  return pool
}

async function main() {
  const payload = await getPayload({ config })
  const pool = getPool(payload)

  await pool.query('CREATE EXTENSION IF NOT EXISTS vector')
  const { rows } = await pool.query<{ extversion: string }>(
    "SELECT extversion FROM pg_extension WHERE extname = 'vector' LIMIT 1",
  )

  const version = rows[0]?.extversion
  if (version) {
    console.log(`pgvector ready (version ${version})`)
  } else {
    console.log('pgvector extension is available')
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
