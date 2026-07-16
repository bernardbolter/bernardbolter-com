/**
 * Production-safe SQL migration for Studio Phase 1 social collections +
 * FieldNotes museumSourced + DINOv2 columns.
 *
 * Usage (Netcup, after git pull, before deploy):
 *   npx tsx src/scripts/add-studio-social-phase1-schema.ts
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

async function tableExists(pool: PgPool, tableName: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName],
  )
  return rows.length > 0
}

async function columnExists(pool: PgPool, tableName: string, columnName: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [tableName, columnName],
  )
  return rows.length > 0
}

async function ensureColumn(
  pool: PgPool,
  table: string,
  column: string,
  ddl: string,
): Promise<void> {
  if (await columnExists(pool, table, column)) {
    console.log(`ok  ${table}.${column}`)
    return
  }
  await pool.query(`ALTER TABLE ${table} ADD COLUMN ${ddl}`)
  console.log(`+   ${table}.${column}`)
}

async function main() {
  const payload = await getPayload({ config })
  const pool = getPgPool(payload)

  console.log('Ensuring FieldNotes museumSourced…')
  await ensureColumn(pool, 'field_notes', 'museum_sourced', 'museum_sourced boolean DEFAULT false')

  console.log('Ensuring DINOv2 columns on artworks…')
  await ensureColumn(
    pool,
    'artworks',
    'dinov2_embedding',
    'dinov2_embedding vector(1024)',
  )
  await ensureColumn(
    pool,
    'artworks',
    'dinov2_embedding_generated_at',
    'dinov2_embedding_generated_at timestamp(3) with time zone',
  )

  // Collection tables are normally created by Payload push. If they are missing,
  // instruct the operator to run a local push or deploy that creates them.
  const requiredTables = [
    'campaigns',
    'themes',
    'queue_items',
    'hashtag_tags',
    'calendar_days',
    'finale_scripts',
    'segments',
    'shots',
    'takes',
  ]

  console.log('\nChecking social collection tables…')
  const missing: string[] = []
  for (const table of requiredTables) {
    if (await tableExists(pool, table)) {
      console.log(`ok  ${table}`)
    } else {
      missing.push(table)
      console.log(`!!  missing ${table}`)
    }
  }

  if (missing.length > 0) {
    console.log(`
Missing tables: ${missing.join(', ')}
Create them via a one-off Payload schema push in a safe environment:
  PAYLOAD_DATABASE_PUSH=true NODE_ENV=development npx payload generate:db-schema
or deploy after local push has been applied / use Payload migrate once migrations exist.
FieldNotes museumSourced + DINOv2 columns are ready regardless.
`)
  } else {
    console.log('\nAll social collection tables present.')
  }

  console.log('Done.')
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
