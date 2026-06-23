/**
 * Create embedded array tables for custom edition substrates and print techniques
 * on art_official_settings (Art/Official settings global).
 *
 * Usage: npx tsx src/scripts/add-art-official-edition-vocabulary-schema.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

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

async function tableExists(pool: PgPool, table: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [table],
  )
  return rows.length > 0
}

async function ensureEmbeddedArrayTable(
  pool: PgPool,
  table: string,
  parentTable: string,
): Promise<void> {
  if (await tableExists(pool, table)) {
    console.log(`Table ${table} already exists.`)
    return
  }

  await pool.query(`
    CREATE TABLE "${table}" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" character varying PRIMARY KEY NOT NULL,
      "value" character varying NOT NULL,
      "label" character varying NOT NULL
    )
  `)

  await pool.query(`
    ALTER TABLE "${table}"
    ADD CONSTRAINT "${table}_parent_id_fk"
    FOREIGN KEY ("_parent_id") REFERENCES "public"."${parentTable}"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION
  `)

  await pool.query(
    `CREATE INDEX "${table}_order_idx" ON "${table}" USING btree ("_order")`,
  )
  await pool.query(
    `CREATE INDEX "${table}_parent_id_idx" ON "${table}" USING btree ("_parent_id")`,
  )

  console.log(`Created table ${table}`)
}

async function main() {
  const payload = await getPayload({ config })
  const pool = getPgPool(payload)

  if (!(await tableExists(pool, 'art_official_settings'))) {
    throw new Error('Table art_official_settings not found — run Payload migrations first.')
  }

  await ensureEmbeddedArrayTable(
    pool,
    'art_official_settings_custom_edition_substrates',
    'art_official_settings',
  )
  await ensureEmbeddedArrayTable(
    pool,
    'art_official_settings_custom_edition_print_techniques',
    'art_official_settings',
  )

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
