/**
 * Verify capture-presets table and field-notes pipeline columns exist.
 *
 * Usage: npm run verify:fieldnotes-pipeline-schema
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })

import { getPayload } from 'payload'
import config from '@/payload.config'

type PgPool = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
}

const CAPTURE_PRESETS_TABLE = 'capture_presets'
const FIELD_NOTES_TABLE = 'field_notes'

const REQUIRED_FIELD_NOTE_COLUMNS = [
  'episode',
  'shot_type',
  'take',
  'verdict',
  'slate_parse_status',
  'capture_preset_id',
] as const

function getPgPool(payload: Awaited<ReturnType<typeof getPayload>>): PgPool {
  const pool = (payload.db as { pool?: PgPool } | undefined)?.pool
  if (!pool) throw new Error('Postgres pool not available on payload.db')
  return pool
}

async function tableExists(pool: PgPool, tableName: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = $1`,
    [tableName],
  )
  return rows.length > 0
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

async function enumHasValue(
  pool: PgPool,
  enumName: string,
  value: string,
): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT e.enumlabel
     FROM pg_type t
     JOIN pg_enum e ON t.oid = e.enumtypid
     WHERE t.typname = $1
       AND e.enumlabel = $2`,
    [enumName, value],
  )
  return rows.length > 0
}

async function main() {
  const payload = await getPayload({ config })
  const pool = getPgPool(payload)

  const missing: string[] = []

  if (!(await tableExists(pool, CAPTURE_PRESETS_TABLE))) {
    missing.push(`table ${CAPTURE_PRESETS_TABLE}`)
  }

  for (const column of REQUIRED_FIELD_NOTE_COLUMNS) {
    if (!(await columnExists(pool, FIELD_NOTES_TABLE, column))) {
      missing.push(`column ${FIELD_NOTES_TABLE}.${column}`)
    }
  }

  if (!(await enumHasValue(pool, 'enum_field_notes_processing_status', 'queued'))) {
    missing.push('enum value enum_field_notes_processing_status.queued')
  }

  if (missing.length === 0) {
    console.log('FieldNotes pipeline schema OK.')
    console.log(`  - ${CAPTURE_PRESETS_TABLE} table present`)
    console.log(`  - ${FIELD_NOTES_TABLE} pipeline columns present`)
    console.log('  - processing_status includes queued')
    process.exit(0)
  }

  console.error('FieldNotes pipeline schema incomplete. Missing:')
  for (const item of missing) {
    console.error(`  - ${item}`)
  }
  console.error('\nRun: npm run migrate:fieldnotes-pipeline')
  process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
