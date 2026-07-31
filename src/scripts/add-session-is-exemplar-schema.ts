/**
 * Add Sessions.isExemplar boolean
 * (docs/events/events-mediamatic-artspan-spec.md footer + art-official-events-dialogue-spec.md §3.2).
 *
 * Usage: npx tsx src/scripts/add-session-is-exemplar-schema.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

import { getPayload } from 'payload'
import config from '@/payload.config'

type PgPool = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
}

async function columnExists(pool: PgPool, tableName: string, columnName: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1
       AND column_name = $2`,
    [tableName, columnName],
  )
  return rows.length > 0
}

async function main() {
  const payload = await getPayload({ config })
  const pool = (payload.db as { pool?: PgPool } | undefined)?.pool
  if (!pool) throw new Error('Postgres pool not available on payload.db')

  if (await columnExists(pool, 'sessions', 'is_exemplar')) {
    console.log('Column sessions.is_exemplar already exists.')
  } else {
    await pool.query(
      `ALTER TABLE "public"."sessions" ADD COLUMN "is_exemplar" boolean DEFAULT false`,
    )
    console.log('Added sessions.is_exemplar')
  }

  console.log('Session isExemplar schema migration complete.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
