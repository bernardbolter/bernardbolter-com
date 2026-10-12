/**
 * Production-safe SQL: webhook_events collection for Vendure sale idempotency.
 *
 * Do NOT use interactive Drizzle push on Netcup.
 *
 * Usage:
 *   npx tsx src/scripts/add-webhook-events-schema.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })

import { getPayload } from 'payload'
import config from '@/payload.config'

type PgPool = {
  query: (
    text: string,
    values?: unknown[],
  ) => Promise<{ rows: Array<Record<string, unknown>>; rowCount?: number }>
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

async function constraintExists(pool: PgPool, constraintName: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM information_schema.table_constraints
     WHERE constraint_schema = 'public' AND constraint_name = $1`,
    [constraintName],
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
  await pool.query(`ALTER TABLE "public"."${table}" ADD COLUMN ${ddl}`)
  console.log(`+   ${table}.${column}`)
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
    console.log(`ok  FK ${constraintName}`)
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
  console.log(`+   FK ${constraintName}`)
}

async function createIndexIfMissing(
  pool: PgPool,
  indexName: string,
  tableName: string,
  columnName: string,
): Promise<void> {
  await pool.query(
    `CREATE INDEX IF NOT EXISTS "${indexName}"
     ON "public"."${tableName}" USING btree ("${columnName}")`,
  )
}

async function ensureLockedDocsRelColumn(
  pool: PgPool,
  column: string,
  refTable: string,
): Promise<void> {
  const locked = 'payload_locked_documents_rels'
  if (!(await tableExists(pool, locked))) return
  await ensureColumn(pool, locked, column, `"${column}" integer`)
  await addFkIfMissing(pool, locked, column, refTable, `${locked}_${column}_fk`, 'CASCADE')
  await createIndexIfMissing(pool, `${locked}_${column}_idx`, locked, column)
}

async function main() {
  console.log('Adding webhook_events schema (SQL, non-interactive)...')

  const payload = await getPayload({ config })
  const pool = getPgPool(payload)

  if (!(await tableExists(pool, 'webhook_events'))) {
    await pool.query(`
      CREATE TABLE "public"."webhook_events" (
        "id" serial PRIMARY KEY NOT NULL,
        "order_code" varchar NOT NULL,
        "order_id" varchar NOT NULL,
        "channel" varchar,
        "occurred_at" timestamp(3) with time zone,
        "received_at" timestamp(3) with time zone NOT NULL,
        "raw_payload" jsonb NOT NULL,
        "selection_ids" jsonb,
        "selection_snapshot" jsonb,
        "processed" boolean DEFAULT false,
        "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
        "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
      )
    `)
    console.log('+   webhook_events')
  } else {
    console.log('ok  webhook_events')
  }

  await pool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS "webhook_events_order_code_idx"
     ON "public"."webhook_events" USING btree ("order_code")`,
  )
  await createIndexIfMissing(pool, 'webhook_events_order_id_idx', 'webhook_events', 'order_id')
  await createIndexIfMissing(pool, 'webhook_events_updated_at_idx', 'webhook_events', 'updated_at')
  await createIndexIfMissing(pool, 'webhook_events_created_at_idx', 'webhook_events', 'created_at')

  await ensureLockedDocsRelColumn(pool, 'webhook_events_id', 'webhook_events')

  console.log('webhook_events schema ready.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
