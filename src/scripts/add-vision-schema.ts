/**
 * Create artworks_embeddings + artworks_vision_analyses nested tables.
 *
 * Usage: npx tsx src/scripts/add-vision-schema.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })

import { getPayload } from 'payload'
import config from '@/payload.config'

type PgPool = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
}

const EMBEDDINGS_TABLE = 'artworks_embeddings'
const VISION_ANALYSES_TABLE = 'artworks_vision_analyses'
const EMBEDDINGS_MODEL_ENUM = 'enum_artworks_embeddings_model'

const EMBEDDING_MODELS = ['clip-vit-large-patch14', 'dinov2-large'] as const

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

async function createEmbeddingsTable(pool: PgPool): Promise<void> {
  if (await tableExists(pool, EMBEDDINGS_TABLE)) {
    console.log(`Table ${EMBEDDINGS_TABLE} already exists.`)
    return
  }

  if (!(await enumExists(pool, EMBEDDINGS_MODEL_ENUM))) {
    const labels = EMBEDDING_MODELS.map((value) => `'${value}'`).join(', ')
    await pool.query(`CREATE TYPE "public"."${EMBEDDINGS_MODEL_ENUM}" AS ENUM(${labels})`)
    console.log(`Created enum ${EMBEDDINGS_MODEL_ENUM}`)
  }

  await pool.query(`
    CREATE TABLE "public"."${EMBEDDINGS_TABLE}" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" character varying NOT NULL,
      "model" "public"."${EMBEDDINGS_MODEL_ENUM}" NOT NULL,
      "dimensions" numeric NOT NULL,
      "pg_vector_column" character varying NOT NULL,
      "generated_date" timestamp(3) with time zone,
      "spec_url" character varying,
      "short_description" character varying,
      CONSTRAINT "${EMBEDDINGS_TABLE}_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "${EMBEDDINGS_TABLE}_parent_id_fk"
        FOREIGN KEY ("_parent_id")
        REFERENCES "public"."artworks"("id")
        ON DELETE CASCADE
    )
  `)

  await pool.query(
    `CREATE INDEX "${EMBEDDINGS_TABLE}_parent_id_idx" ON "public"."${EMBEDDINGS_TABLE}" USING btree ("_parent_id")`,
  )

  console.log(`Created table ${EMBEDDINGS_TABLE}`)
}

async function createVisionAnalysesTable(pool: PgPool): Promise<void> {
  if (await tableExists(pool, VISION_ANALYSES_TABLE)) {
    console.log(`Table ${VISION_ANALYSES_TABLE} already exists.`)
    return
  }

  await pool.query(`
    CREATE TABLE "public"."${VISION_ANALYSES_TABLE}" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" character varying NOT NULL,
      "text" character varying NOT NULL,
      "model" character varying NOT NULL,
      "date" timestamp(3) with time zone NOT NULL,
      CONSTRAINT "${VISION_ANALYSES_TABLE}_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "${VISION_ANALYSES_TABLE}_parent_id_fk"
        FOREIGN KEY ("_parent_id")
        REFERENCES "public"."artworks"("id")
        ON DELETE CASCADE
    )
  `)

  await pool.query(
    `CREATE INDEX "${VISION_ANALYSES_TABLE}_parent_id_idx" ON "public"."${VISION_ANALYSES_TABLE}" USING btree ("_parent_id")`,
  )

  console.log(`Created table ${VISION_ANALYSES_TABLE}`)
}

async function main() {
  const payload = await getPayload({ config })
  const pool = getPgPool(payload)

  await createEmbeddingsTable(pool)
  await createVisionAnalysesTable(pool)

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
