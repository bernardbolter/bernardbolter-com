/**
 * Add contactPhoto + contactPhotoCaption columns after schema change.
 *
 * Usage: npx tsx src/scripts/add-contact-photo-fields.ts
 *
 * Alternative: PAYLOAD_DATABASE_PUSH=true pnpm dev (once), then unset the env var.
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

  await pool.query(`ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${definition}`)
  console.log(`Added ${tableName}.${columnName}`)
}

async function main() {
  const payload = await getPayload({ config })
  const pool = getPgPool(payload)

  await addColumnIfMissing(pool, 'artists', 'contact_photo_id', 'integer')

  const hasFk = await pool.query(
    `SELECT 1
     FROM information_schema.table_constraints
     WHERE constraint_schema = 'public'
       AND constraint_name = 'artists_contact_photo_id_media_id_fk'`,
  )

  if (hasFk.rows.length === 0 && (await columnExists(pool, 'artists', 'contact_photo_id'))) {
    await pool.query(`
      ALTER TABLE "artists"
      ADD CONSTRAINT "artists_contact_photo_id_media_id_fk"
      FOREIGN KEY ("contact_photo_id")
      REFERENCES "public"."media"("id")
      ON DELETE SET NULL
      ON UPDATE NO ACTION
    `)
    console.log('Added FK artists.contact_photo_id → media.id')
  }

  await pool.query(
    `CREATE INDEX IF NOT EXISTS "artists_contact_photo_idx"
     ON "public"."artists" USING btree ("contact_photo_id")`,
  )

  await addColumnIfMissing(
    pool,
    'artists_locales',
    'contact_photo_caption',
    'character varying',
  )

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
