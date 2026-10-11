/**
 * Production-safe SQL migration for the Redirects collection.
 *
 * Usage (on Netcup, after git pull, before deploy):
 *   npx tsx src/scripts/add-redirects-schema.ts
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

async function enumExists(pool: PgPool, enumName: string): Promise<boolean> {
  const { rows } = await pool.query(`SELECT 1 FROM pg_type WHERE typname = $1`, [enumName])
  return rows.length > 0
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

  if (!(await tableExists(pool, 'redirects'))) {
    await pool.query(`
      CREATE TABLE redirects (
        id serial PRIMARY KEY,
        from_path varchar NOT NULL,
        to_path varchar NOT NULL,
        source ${enumName} NOT NULL DEFAULT 'manual',
        updated_at timestamptz NOT NULL DEFAULT now(),
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `)
    await pool.query(`CREATE UNIQUE INDEX redirects_from_path_idx ON redirects (from_path)`)
    await pool.query(`CREATE INDEX redirects_to_path_idx ON redirects (to_path)`)
    console.log('created table redirects')
  } else {
    console.log('table redirects already exists')
  }

  console.log('redirects schema ready')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
