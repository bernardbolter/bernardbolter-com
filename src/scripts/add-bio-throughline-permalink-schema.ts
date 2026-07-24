/**
 * Production-safe SQL migration for bio/throughline permalink fields.
 *
 * Adds slug + discoveryExcerpt to bio timeline + statement throughlines;
 * reshapes reinforcingSessions from hasMany → nested array of {session, note}.
 *
 * Do NOT use Payload Drizzle push on Netcup for this.
 *
 * Usage (on Netcup, after git pull):
 *   npx tsx src/scripts/add-bio-throughline-permalink-schema.ts
 *   npx tsx src/scripts/backfill-bio-throughline-permalinks.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })

import { getPayload } from 'payload'
import config from '@/payload.config'

type PgPool = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
}

const BIO_TABLE = 'artists_bio_timeline_entries'
const THROUGHLINE_TABLE = 'artists_statement_throughlines'
const THROUGHLINE_RELS = 'artists_statement_throughlines_rels'
const REINFORCING_TABLE = 'artists_statement_throughlines_reinforcing_sessions'

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

async function constraintExists(pool: PgPool, constraintName: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM information_schema.table_constraints
     WHERE constraint_schema = 'public' AND constraint_name = $1`,
    [constraintName],
  )
  return rows.length > 0
}

async function indexExists(pool: PgPool, indexName: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = $1`,
    [indexName],
  )
  return rows.length > 0
}

async function addColumnIfMissing(
  pool: PgPool,
  tableName: string,
  columnName: string,
  definition: string,
): Promise<void> {
  if (await columnExists(pool, tableName, columnName)) {
    console.log(`Column ${tableName}.${columnName} already exists.`)
    return
  }
  await pool.query(`ALTER TABLE "public"."${tableName}" ADD COLUMN "${columnName}" ${definition}`)
  console.log(`Added ${tableName}.${columnName}`)
}

async function addFkIfMissing(
  pool: PgPool,
  tableName: string,
  columnName: string,
  refTable: string,
  constraintName: string,
  onDelete: 'SET NULL' | 'CASCADE' = 'SET NULL',
): Promise<void> {
  if (await constraintExists(pool, constraintName)) {
    console.log(`FK ${constraintName} already exists.`)
    return
  }
  await pool.query(`
    ALTER TABLE "public"."${tableName}"
    ADD CONSTRAINT "${constraintName}"
    FOREIGN KEY ("${columnName}")
    REFERENCES "public"."${refTable}"("id")
    ON DELETE ${onDelete}
    ON UPDATE NO ACTION
  `)
  console.log(`Added FK ${constraintName}`)
}

async function addUniqueIndexIfMissing(
  pool: PgPool,
  tableName: string,
  columnName: string,
  indexName: string,
): Promise<void> {
  if (await indexExists(pool, indexName)) {
    console.log(`Index ${indexName} already exists.`)
    return
  }
  await pool.query(
    `CREATE UNIQUE INDEX "${indexName}" ON "public"."${tableName}" USING btree ("${columnName}")`,
  )
  console.log(`Created unique index ${indexName}`)
}

async function assertReinforcingSessionsEmpty(pool: PgPool): Promise<void> {
  if (!(await tableExists(pool, THROUGHLINE_RELS))) {
    console.log(`${THROUGHLINE_RELS} missing — nothing to migrate.`)
    return
  }
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM "public"."${THROUGHLINE_RELS}"
     WHERE "path" = 'reinforcingSessions'
        OR "path" LIKE '%.reinforcingSessions'
        OR "path" LIKE 'reinforcingSessions.%'`,
  )
  const count = Number(rows[0]?.count ?? 0)
  if (count > 0) {
    throw new Error(
      `Aborting: found ${count} live reinforcingSessions relation row(s). ` +
        `This reshape is only safe when the array is empty — stop and migrate data manually.`,
    )
  }
  console.log('Confirmed: live reinforcingSessions hasMany rows are empty.')
}

async function main() {
  const payload = await getPayload({ config })
  const pool = getPgPool(payload)

  console.log('Adding bio/throughline permalink schema (additive only)…')

  await assertReinforcingSessionsEmpty(pool)

  for (const table of [BIO_TABLE, THROUGHLINE_TABLE]) {
    if (!(await tableExists(pool, table))) {
      throw new Error(`Expected table ${table} — run add-sessions-foundation-schema.ts first.`)
    }
    await addColumnIfMissing(pool, table, 'slug', 'character varying')
    await addColumnIfMissing(pool, table, 'discovery_excerpt', 'jsonb')
    await addUniqueIndexIfMissing(pool, table, 'slug', `${table}_slug_idx`)
  }

  if (!(await tableExists(pool, REINFORCING_TABLE))) {
    await pool.query(`
      CREATE TABLE "public"."${REINFORCING_TABLE}" (
        "_order" integer NOT NULL,
        "_parent_id" character varying NOT NULL,
        "id" character varying NOT NULL,
        "session_id" integer,
        "reinforcement_note" character varying,
        CONSTRAINT "${REINFORCING_TABLE}_pkey" PRIMARY KEY ("id")
      )
    `)
    await pool.query(
      `CREATE INDEX IF NOT EXISTS "${REINFORCING_TABLE}_order_idx"
       ON "public"."${REINFORCING_TABLE}" USING btree ("_order")`,
    )
    await pool.query(
      `CREATE INDEX IF NOT EXISTS "${REINFORCING_TABLE}_parent_id_idx"
       ON "public"."${REINFORCING_TABLE}" USING btree ("_parent_id")`,
    )
    await addFkIfMissing(
      pool,
      REINFORCING_TABLE,
      '_parent_id',
      THROUGHLINE_TABLE,
      `${REINFORCING_TABLE}_parent_id_fk`,
      'CASCADE',
    )
    await addFkIfMissing(
      pool,
      REINFORCING_TABLE,
      'session_id',
      'sessions',
      `${REINFORCING_TABLE}_session_id_fk`,
      'SET NULL',
    )
    await pool.query(
      `CREATE INDEX IF NOT EXISTS "${REINFORCING_TABLE}_session_idx"
       ON "public"."${REINFORCING_TABLE}" USING btree ("session_id")`,
    )
    console.log(`Created table ${REINFORCING_TABLE}`)
  } else {
    console.log(`Table ${REINFORCING_TABLE} already exists.`)
  }

  console.log('Done.')
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
