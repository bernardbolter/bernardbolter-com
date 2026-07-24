/**
 * Additive SQL for sessions audit integrity fields.
 * Do NOT use interactive Drizzle push on Netcup.
 *
 * Usage: npx tsx src/scripts/add-sessions-audit-integrity-schema.ts
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

async function enumExists(pool: PgPool, enumName: string): Promise<boolean> {
  const { rows } = await pool.query(`SELECT 1 FROM pg_type WHERE typname = $1`, [enumName])
  return rows.length > 0
}

async function main() {
  const payload = await getPayload({ config })
  const pool = getPgPool(payload)

  // Parent group columns on sessions
  if (!(await columnExists(pool, 'sessions', 'session_struggle_flag_has_struggle'))) {
    await pool.query(
      `ALTER TABLE sessions ADD COLUMN session_struggle_flag_has_struggle boolean DEFAULT false`,
    )
    console.log('Added sessions.session_struggle_flag_has_struggle')
  }
  if (!(await columnExists(pool, 'sessions', 'session_struggle_flag_note'))) {
    await pool.query(`ALTER TABLE sessions ADD COLUMN session_struggle_flag_note varchar`)
    console.log('Added sessions.session_struggle_flag_note')
  }

  const struggleEnum = 'enum_sessions_session_struggle_flag_struggle_types'
  if (!(await enumExists(pool, struggleEnum))) {
    await pool.query(
      `CREATE TYPE ${struggleEnum} AS ENUM (
        'commit-error',
        'description-upload-mismatch',
        'blank-turn-density',
        'unresolved-lookup-failure',
        'other'
      )`,
    )
    console.log(`Created ${struggleEnum}`)
  }

  const struggleTypesTable = 'sessions_session_struggle_flag_struggle_types'
  if (!(await tableExists(pool, struggleTypesTable))) {
    await pool.query(`
      CREATE TABLE ${struggleTypesTable} (
        order_id integer NOT NULL,
        parent_id integer NOT NULL,
        value ${struggleEnum},
        id serial PRIMARY KEY
      )
    `)
    await pool.query(
      `CREATE INDEX sessions_session_struggle_flag_struggle_types_order_idx
       ON ${struggleTypesTable} USING btree (order_id)`,
    )
    await pool.query(
      `CREATE INDEX sessions_session_struggle_flag_struggle_types_parent_idx
       ON ${struggleTypesTable} USING btree (parent_id)`,
    )
    console.log(`Created ${struggleTypesTable}`)
  }

  const coveredTable = 'sessions_fields_covered_this_session'
  if (!(await tableExists(pool, coveredTable))) {
    await pool.query(`
      CREATE TABLE ${coveredTable} (
        _order integer NOT NULL,
        _parent_id integer NOT NULL,
        id varchar PRIMARY KEY,
        field varchar
      )
    `)
    await pool.query(
      `CREATE INDEX sessions_fields_covered_this_session_order_idx ON ${coveredTable} USING btree (_order)`,
    )
    await pool.query(
      `CREATE INDEX sessions_fields_covered_this_session_parent_id_idx ON ${coveredTable} USING btree (_parent_id)`,
    )
    console.log(`Created ${coveredTable}`)
  }

  const conflictsTable = 'sessions_prior_field_conflicts'
  const resolutionEnum = 'enum_sessions_prior_field_conflicts_resolution'
  if (!(await enumExists(pool, resolutionEnum))) {
    await pool.query(
      `CREATE TYPE ${resolutionEnum} AS ENUM ('kept-prior', 'replaced', 'merged', 'unresolved')`,
    )
    console.log(`Created ${resolutionEnum}`)
  }
  if (!(await tableExists(pool, conflictsTable))) {
    await pool.query(`
      CREATE TABLE ${conflictsTable} (
        _order integer NOT NULL,
        _parent_id integer NOT NULL,
        id varchar PRIMARY KEY,
        field varchar NOT NULL,
        prior_value jsonb,
        prior_session_ref_id integer,
        new_value jsonb,
        resolution ${resolutionEnum} DEFAULT 'unresolved'
      )
    `)
    await pool.query(
      `CREATE INDEX sessions_prior_field_conflicts_order_idx ON ${conflictsTable} USING btree (_order)`,
    )
    await pool.query(
      `CREATE INDEX sessions_prior_field_conflicts_parent_id_idx ON ${conflictsTable} USING btree (_parent_id)`,
    )
    console.log(`Created ${conflictsTable}`)
  }

  console.log('Sessions audit integrity schema ready.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
