/**
 * Production-safe SQL migration for the Redirects collection.
 *
 * Usage (on Netcup, after git pull, before deploy):
 *   npx tsx src/scripts/add-redirects-schema.ts
 *   npm run migrate:redirects-schema
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })

import { getPayload } from 'payload'
import config from '@/payload.config'

type PgPool = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
}

const REDIRECTS = 'redirects'
const LOCKED_DOCS_RELS = 'payload_locked_documents_rels'

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

async function constraintExists(pool: PgPool, constraintName: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM information_schema.table_constraints
     WHERE constraint_schema = 'public' AND constraint_name = $1`,
    [constraintName],
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

async function migratePayloadLockedDocumentsRels(pool: PgPool): Promise<void> {
  if (!(await tableExists(pool, LOCKED_DOCS_RELS))) {
    console.log(`Table ${LOCKED_DOCS_RELS} not found — skipping.`)
    return
  }

  await addColumnIfMissing(pool, LOCKED_DOCS_RELS, 'redirects_id', 'integer')

  const fkName = `${LOCKED_DOCS_RELS}_redirects_fk`
  if (!(await constraintExists(pool, fkName))) {
    await pool.query(`
      ALTER TABLE "public"."${LOCKED_DOCS_RELS}"
      ADD CONSTRAINT "${fkName}"
      FOREIGN KEY ("redirects_id")
      REFERENCES "public"."${REDIRECTS}"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `)
    console.log(`Added FK ${fkName}`)
  }

  await pool.query(
    `CREATE INDEX IF NOT EXISTS "${LOCKED_DOCS_RELS}_redirects_id_idx"
     ON "public"."${LOCKED_DOCS_RELS}" USING btree ("redirects_id")`,
  )
}

async function main() {
  const payload = await getPayload({ config })
  const pool = getPgPool(payload)

  const enumName = 'enum_redirects_source'
  if (!(await enumExists(pool, enumName))) {
    await pool.query(
      `CREATE TYPE ${enumName} AS ENUM ('session', 'throughline', 'bio-entry', 'manual')`,
    )
    console.log(`created enum ${enumName}`)
  }

  if (!(await tableExists(pool, REDIRECTS))) {
    await pool.query(`
      CREATE TABLE ${REDIRECTS} (
        id serial PRIMARY KEY,
        from_path varchar NOT NULL,
        to_path varchar NOT NULL,
        source ${enumName} NOT NULL DEFAULT 'manual',
        updated_at timestamptz NOT NULL DEFAULT now(),
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `)
    await pool.query(`CREATE UNIQUE INDEX redirects_from_path_idx ON ${REDIRECTS} (from_path)`)
    await pool.query(`CREATE INDEX redirects_to_path_idx ON ${REDIRECTS} (to_path)`)
    console.log('created table redirects')
  } else {
    console.log('table redirects already exists')
  }

  await migratePayloadLockedDocumentsRels(pool)

  console.log('redirects schema ready')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
