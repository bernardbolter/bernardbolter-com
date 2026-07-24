/**
 * Production-safe SQL migration: add sessions.agent_model for Tier 5 DialogueSelfAudit.
 *
 * Do NOT use Payload Drizzle push on Netcup for this — it prompts to delete
 * unrelated legacy columns.
 *
 * Usage (on Netcup, after git pull):
 *   npx tsx src/scripts/add-sessions-agent-model-schema.ts
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

async function columnExists(pool: PgPool, tableName: string, columnName: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [tableName, columnName],
  )
  return rows.length > 0
}

async function main() {
  const payload = await getPayload({ config })
  const pool = getPgPool(payload)

  if (await columnExists(pool, 'sessions', 'agent_model')) {
    console.log('sessions.agent_model already exists — nothing to do.')
  } else {
    await pool.query(`ALTER TABLE sessions ADD COLUMN agent_model varchar`)
    console.log('Added sessions.agent_model')
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
