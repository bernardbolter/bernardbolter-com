/**
 * Create artworks_related_works nested table for relatedWorks[].
 *
 * Usage: npx tsx src/scripts/add-related-works-schema.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

import { getPayload } from 'payload'
import config from '@/payload.config'

type PgPool = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
}

const RELATIONSHIP_TYPES = [
  'derivative-oil-painting',
  'derivative-other',
  'series-related',
  'other',
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

async function enumExists(pool: PgPool, enumName: string): Promise<boolean> {
  const { rows } = await pool.query(`SELECT 1 FROM pg_type WHERE typname = $1`, [enumName])
  return rows.length > 0
}

async function main() {
  const payload = await getPayload({ config })
  const pool = getPgPool(payload)
  const tableName = 'artworks_related_works'
  const enumName = 'enum_artworks_related_works_relationship_type'

  if (await tableExists(pool, tableName)) {
    console.log(`Table ${tableName} already exists.`)
    process.exit(0)
  }

  if (!(await enumExists(pool, enumName))) {
    const labels = RELATIONSHIP_TYPES.map((value) => `'${value}'`).join(', ')
    await pool.query(`CREATE TYPE "public"."${enumName}" AS ENUM(${labels})`)
    console.log(`Created enum ${enumName}`)
  }

  await pool.query(`
    CREATE TABLE "public"."${tableName}" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" character varying NOT NULL,
      "related_artwork_id" integer,
      "relationship_type" "public"."${enumName}",
      "related_work_note" character varying,
      CONSTRAINT "${tableName}_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "${tableName}_parent_id_fk"
        FOREIGN KEY ("_parent_id")
        REFERENCES "public"."artworks"("id")
        ON DELETE CASCADE,
      CONSTRAINT "${tableName}_related_artwork_id_fk"
        FOREIGN KEY ("related_artwork_id")
        REFERENCES "public"."artworks"("id")
        ON DELETE SET NULL
    )
  `)

  await pool.query(
    `CREATE INDEX "${tableName}_parent_id_idx" ON "public"."${tableName}" USING btree ("_parent_id")`,
  )
  await pool.query(
    `CREATE INDEX "${tableName}_related_artwork_id_idx" ON "public"."${tableName}" USING btree ("related_artwork_id")`,
  )

  console.log(`Created table ${tableName}`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
