/**
 * Production-safe SQL migration for Neighborhood Commissions:
 * - collection ach-neighborhood-sources (+ locales)
 * - global neighborhood-commissions (+ locales)
 * - Artworks.ach.neighborhoodCommission columns + proofRoles hasMany
 *
 * Do NOT use interactive Drizzle push on Netcup (enum create-vs-rename prompts).
 *
 * Usage (local via SSH tunnel :5433, or on Netcup after pull):
 *   npx tsx src/scripts/add-neighborhood-commissions-schema.ts
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

async function createEnumIfMissing(
  pool: PgPool,
  enumName: string,
  values: readonly string[],
): Promise<void> {
  if (await enumExists(pool, enumName)) {
    console.log(`ok  enum ${enumName}`)
    return
  }
  const labels = values.map((value) => `'${value}'`).join(', ')
  await pool.query(`CREATE TYPE "public"."${enumName}" AS ENUM(${labels})`)
  console.log(`+   enum ${enumName}`)
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
  console.log('Adding Neighborhood Commissions schema (SQL, non-interactive)...')

  const payload = await getPayload({ config })
  const pool = getPgPool(payload)

  const cityValues = ['san-francisco'] as const
  const statusValues = ['available', 'held', 'commissioned', 'painted'] as const
  const licenseValues = ['cc0', 'cc-by', 'cc-by-sa', 'public-domain', 'other'] as const
  const proofRoleValues = [
    'designer-home',
    'artspan-juried',
    'auction-resale',
    'follow-on-commission',
  ] as const

  await createEnumIfMissing(pool, 'enum_ach_neighborhood_sources_city', cityValues)
  await createEnumIfMissing(pool, 'enum_ach_neighborhood_sources_status', statusValues)
  await createEnumIfMissing(pool, 'enum_ach_neighborhood_sources_source_license', licenseValues)
  await createEnumIfMissing(pool, 'enum_neighborhood_commissions_city', cityValues)
  await createEnumIfMissing(pool, 'enum_artworks_ach_neighborhood_commission_city', cityValues)
  await createEnumIfMissing(
    pool,
    'enum_artworks_ach_neighborhood_commission_proof_roles',
    proofRoleValues,
  )

  // ── Collection: ach_neighborhood_sources ─────────────────────
  if (!(await tableExists(pool, 'ach_neighborhood_sources'))) {
    await pool.query(`
      CREATE TABLE "public"."ach_neighborhood_sources" (
        "id" serial PRIMARY KEY NOT NULL,
        "published" boolean DEFAULT false,
        "status" "public"."enum_ach_neighborhood_sources_status" DEFAULT 'available' NOT NULL,
        "sort_order" numeric DEFAULT 0,
        "city" "public"."enum_ach_neighborhood_sources_city" DEFAULT 'san-francisco' NOT NULL,
        "neighborhood" varchar NOT NULL,
        "source_image_id" integer NOT NULL,
        "source_creator" varchar,
        "source_creator_wikidata_uri" varchar,
        "approximate_date" varchar,
        "image_capture_type_id" integer,
        "source_wikidata_uri" varchar,
        "source_wikimedia_commons_url" varchar,
        "source_institution" varchar,
        "source_institution_wikidata_uri" varchar,
        "source_institution_url" varchar,
        "source_license" "public"."enum_ach_neighborhood_sources_source_license",
        "source_license_url" varchar,
        "source_credit" varchar,
        "resulting_artwork_id" integer,
        "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
        "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
      )
    `)
    console.log('+   ach_neighborhood_sources')
  } else {
    console.log('ok  ach_neighborhood_sources')
  }

  await addFkIfMissing(
    pool,
    'ach_neighborhood_sources',
    'source_image_id',
    'media',
    'ach_neighborhood_sources_source_image_id_media_id_fk',
    'CASCADE',
  )
  await addFkIfMissing(
    pool,
    'ach_neighborhood_sources',
    'image_capture_type_id',
    'image_capture_technologies',
    'ach_neighborhood_sources_image_capture_type_id_image_capture_technologies_id_fk',
    'SET NULL',
  )
  await addFkIfMissing(
    pool,
    'ach_neighborhood_sources',
    'resulting_artwork_id',
    'artworks',
    'ach_neighborhood_sources_resulting_artwork_id_artworks_id_fk',
    'SET NULL',
  )
  await createIndexIfMissing(pool, 'ach_neighborhood_sources_city_idx', 'ach_neighborhood_sources', 'city')
  await createIndexIfMissing(
    pool,
    'ach_neighborhood_sources_updated_at_idx',
    'ach_neighborhood_sources',
    'updated_at',
  )
  await createIndexIfMissing(
    pool,
    'ach_neighborhood_sources_created_at_idx',
    'ach_neighborhood_sources',
    'created_at',
  )

  if (!(await tableExists(pool, 'ach_neighborhood_sources_locales'))) {
    await pool.query(`
      CREATE TABLE "public"."ach_neighborhood_sources_locales" (
        "source_image_alt_text" varchar,
        "source_title" varchar,
        "id" serial PRIMARY KEY NOT NULL,
        "_locale" "_locales" NOT NULL,
        "_parent_id" integer NOT NULL
      )
    `)
    await addFkIfMissing(
      pool,
      'ach_neighborhood_sources_locales',
      '_parent_id',
      'ach_neighborhood_sources',
      'ach_neighborhood_sources_locales_parent_id_fk',
      'CASCADE',
    )
    console.log('+   ach_neighborhood_sources_locales')
  } else {
    console.log('ok  ach_neighborhood_sources_locales')
  }

  await ensureLockedDocsRelColumn(pool, 'ach_neighborhood_sources_id', 'ach_neighborhood_sources')

  // ── Global: neighborhood_commissions ─────────────────────────
  if (!(await tableExists(pool, 'neighborhood_commissions'))) {
    await pool.query(`
      CREATE TABLE "public"."neighborhood_commissions" (
        "id" serial PRIMARY KEY NOT NULL,
        "active" boolean DEFAULT true,
        "city" "public"."enum_neighborhood_commissions_city" DEFAULT 'san-francisco' NOT NULL,
        "founding_batch_size" numeric DEFAULT 5 NOT NULL,
        "founding_batch_price_usd" numeric DEFAULT 1800 NOT NULL,
        "founding_batch_size_label" varchar DEFAULT '36"×36"' NOT NULL,
        "founding_slots_remaining" numeric DEFAULT 5 NOT NULL,
        "artspan_event_id" integer,
        "private_pricing_notes_designer_agent_price_range" varchar,
        "private_pricing_notes_post_founding_direct_range" varchar,
        "private_pricing_notes_internal_note" varchar,
        "updated_at" timestamp(3) with time zone,
        "created_at" timestamp(3) with time zone
      )
    `)
    console.log('+   neighborhood_commissions')
  } else {
    console.log('ok  neighborhood_commissions')
  }

  await addFkIfMissing(
    pool,
    'neighborhood_commissions',
    'artspan_event_id',
    'events',
    'neighborhood_commissions_artspan_event_id_events_id_fk',
    'SET NULL',
  )

  if (!(await tableExists(pool, 'neighborhood_commissions_locales'))) {
    await pool.query(`
      CREATE TABLE "public"."neighborhood_commissions_locales" (
        "founding_batch_framing" varchar,
        "page_title" varchar,
        "eyebrow" varchar,
        "pitch" varchar,
        "berlin_frame" varchar,
        "archive_credibility" varchar,
        "tier1_intro" varchar,
        "tier2_intro" varchar,
        "tier3_intro" varchar,
        "designer_commission_note" varchar,
        "id" serial PRIMARY KEY NOT NULL,
        "_locale" "_locales" NOT NULL,
        "_parent_id" integer NOT NULL
      )
    `)
    await addFkIfMissing(
      pool,
      'neighborhood_commissions_locales',
      '_parent_id',
      'neighborhood_commissions',
      'neighborhood_commissions_locales_parent_id_fk',
      'CASCADE',
    )
    console.log('+   neighborhood_commissions_locales')
  } else {
    console.log('ok  neighborhood_commissions_locales')
  }

  // Seed empty global row if missing (Payload globals expect a row)
  {
    const { rows } = await pool.query(`SELECT id FROM "public"."neighborhood_commissions" LIMIT 1`)
    if (rows.length === 0) {
      await pool.query(`
        INSERT INTO "public"."neighborhood_commissions" (
          "active", "city", "founding_batch_size", "founding_batch_price_usd",
          "founding_batch_size_label", "founding_slots_remaining", "updated_at", "created_at"
        ) VALUES (
          true, 'san-francisco', 5, 1800, '36"×36"', 5, now(), now()
        )
      `)
      console.log('+   neighborhood_commissions seed row')
    } else {
      console.log('ok  neighborhood_commissions seed row')
    }
  }

  // ── Artworks.ach.neighborhoodCommission ──────────────────────
  await ensureColumn(
    pool,
    'artworks',
    'ach_neighborhood_commission_revisited_subject_available',
    `"ach_neighborhood_commission_revisited_subject_available" boolean DEFAULT false`,
  )
  await ensureColumn(
    pool,
    'artworks',
    'ach_neighborhood_commission_city',
    `"ach_neighborhood_commission_city" "public"."enum_artworks_ach_neighborhood_commission_city" DEFAULT 'san-francisco'`,
  )
  await ensureColumn(
    pool,
    'artworks',
    'ach_neighborhood_commission_prior_subject_artwork_id',
    `"ach_neighborhood_commission_prior_subject_artwork_id" integer`,
  )
  await ensureColumn(
    pool,
    'artworks',
    'ach_neighborhood_commission_neighborhood_source_id',
    `"ach_neighborhood_commission_neighborhood_source_id" integer`,
  )

  await addFkIfMissing(
    pool,
    'artworks',
    'ach_neighborhood_commission_prior_subject_artwork_id',
    'artworks',
    'artworks_ach_neighborhood_commission_prior_subject_artwork_id_artworks_id_fk',
    'SET NULL',
  )
  await addFkIfMissing(
    pool,
    'artworks',
    'ach_neighborhood_commission_neighborhood_source_id',
    'ach_neighborhood_sources',
    'artworks_ach_neighborhood_commission_neighborhood_source_id_ach_neighborhood_sources_id_fk',
    'SET NULL',
  )

  await ensureColumn(
    pool,
    'artworks_locales',
    'ach_neighborhood_commission_proof_note',
    `"ach_neighborhood_commission_proof_note" varchar`,
  )

  if (!(await tableExists(pool, 'artworks_ach_neighborhood_commission_proof_roles'))) {
    await pool.query(`
      CREATE TABLE "public"."artworks_ach_neighborhood_commission_proof_roles" (
        "order" integer NOT NULL,
        "parent_id" integer NOT NULL,
        "value" "public"."enum_artworks_ach_neighborhood_commission_proof_roles",
        "id" serial PRIMARY KEY NOT NULL
      )
    `)
    await addFkIfMissing(
      pool,
      'artworks_ach_neighborhood_commission_proof_roles',
      'parent_id',
      'artworks',
      'artworks_ach_neighborhood_commission_proof_roles_parent_fk',
      'CASCADE',
    )
    await createIndexIfMissing(
      pool,
      'artworks_ach_neighborhood_commission_proof_roles_order_idx',
      'artworks_ach_neighborhood_commission_proof_roles',
      'order',
    )
    await createIndexIfMissing(
      pool,
      'artworks_ach_neighborhood_commission_proof_roles_parent_idx',
      'artworks_ach_neighborhood_commission_proof_roles',
      'parent_id',
    )
    console.log('+   artworks_ach_neighborhood_commission_proof_roles')
  } else {
    console.log('ok  artworks_ach_neighborhood_commission_proof_roles')
  }

  const destroy = (payload.db as { destroy?: () => Promise<void> } | undefined)?.destroy
  if (destroy) await destroy.call(payload.db)

  console.log('Neighborhood Commissions schema migration complete.')
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
