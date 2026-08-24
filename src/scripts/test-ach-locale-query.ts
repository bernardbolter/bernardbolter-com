/**
 * Safe check: report Postgres version/address (no secrets) and whether
 * GET-equivalent artworks find() works. Never migrates a PG 17 host.
 *
 * Usage: npx tsx src/scripts/test-ach-locale-query.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

import { getPayload } from 'payload'
import config from '../payload.config.ts'

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

  const info = await pool.query(
    `SELECT current_database() AS db,
            inet_server_addr()::text AS addr,
            inet_server_port() AS port,
            split_part(version(), ' on ', 1) AS version`,
  )
  console.log(info.rows[0])

  const cols = await pool.query(
    `SELECT table_name, column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND column_name IN (
         'ach_location_older_story',
         'ach_location_newer_story',
         'ach_hero_hero_eligible',
         'ach_hero_hero_fields',
         'ach_hero_hero_photo_id'
       )
     ORDER BY table_name, column_name`,
  )
  console.log('present columns:', cols.rows)

  try {
    const found = await payload.find({
      collection: 'artworks',
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    console.log('artworks find: ok', { totalDocs: found.totalDocs, docs: found.docs.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.log('artworks find: FAIL', message.split('\n')[0])
  }

  const destroy = (payload.db as { destroy?: () => Promise<void> } | undefined)?.destroy
  if (destroy) await destroy.call(payload.db)
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
