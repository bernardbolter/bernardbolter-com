/**
 * Schema reconciliation: json → array tables for ownership/loans/confidence,
 * plus People FKs on events collaborators / co-speakers.
 *
 * One-off data copy, not a Payload `payload_migrations` entry (Drizzle push
 * would prompt to drop unrelated live columns). Idempotent: a second run
 * skips the jsonb copy if the completion marker exists or dest tables
 * already have rows. Inserts use UNIQUE (_parent_id, _order) so a race
 * cannot duplicate. Do not rely on ON CONFLICT (id) — source JSON had no
 * stable ids, so the first version minted a new UUID every run.
 *
 * Do NOT use Payload Drizzle push on Netcup for this.
 *
 * Usage (after git pull, on a DB backup):
 *   npx tsx src/scripts/migrate-schema-reconciliation-provenance.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })

import { getPayload } from 'payload'
import config from '@/payload.config'

import { normalizeProvenanceConfidenceLevel } from '@/lib/artwork/provenanceConfidence'
import {
  jsonCopySkipReason,
  parentOrderUniqueIndexName,
  PROVENANCE_COPY_MARKER_ID,
  PROVENANCE_COPY_MARKER_TABLE,
} from '@/scripts/provenanceJsonCopyGuard'

type PgPool = {
  query: (
    text: string,
    values?: unknown[],
  ) => Promise<{ rows: Array<Record<string, unknown>>; rowCount?: number | null }>
}

const OWNERSHIP_TABLE = 'artworks_ownership_history'
const LOAN_TABLE = 'artworks_loan_history'
const CONFIDENCE_TABLE = 'artworks_provenance_confidence_layer'

const EVENT_TYPE_ENUM = 'enum_artworks_ownership_history_event_type'
const CLAIM_STATUS_ENUM = 'enum_artworks_ownership_history_claim_status'
const CONFIDENCE_ENUM = 'enum_artworks_provenance_confidence_layer_confidence_level'
const SALE_CURRENCY_ENUM = 'enum_artworks_ownership_history_sale_sale_currency'

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

async function tableRowCount(pool: PgPool, tableName: string): Promise<number> {
  if (!(await tableExists(pool, tableName))) return 0
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM "${tableName}"`)
  return Number(rows[0]?.n ?? 0)
}

async function ensureCopyMarkerTable(pool: PgPool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "${PROVENANCE_COPY_MARKER_TABLE}" (
      "id" character varying PRIMARY KEY,
      "completed_at" timestamp(3) with time zone NOT NULL DEFAULT now()
    )
  `)
}

async function copyMarkerExists(pool: PgPool): Promise<boolean> {
  if (!(await tableExists(pool, PROVENANCE_COPY_MARKER_TABLE))) return false
  const { rows } = await pool.query(
    `SELECT 1 FROM "${PROVENANCE_COPY_MARKER_TABLE}" WHERE "id" = $1`,
    [PROVENANCE_COPY_MARKER_ID],
  )
  return rows.length > 0
}

async function writeCopyMarker(pool: PgPool): Promise<void> {
  await ensureCopyMarkerTable(pool)
  await pool.query(
    `INSERT INTO "${PROVENANCE_COPY_MARKER_TABLE}" ("id") VALUES ($1) ON CONFLICT ("id") DO NOTHING`,
    [PROVENANCE_COPY_MARKER_ID],
  )
}

/** Keep one row per (_parent_id, _order) then unique-index so re-inserts no-op. */
async function ensureUniqueParentOrder(pool: PgPool, tableName: string): Promise<void> {
  if (!(await tableExists(pool, tableName))) return
  await pool.query(`
    DELETE FROM "${tableName}" a
    USING "${tableName}" b
    WHERE a._parent_id = b._parent_id
      AND a._order = b._order
      AND a.id > b.id
  `)
  const indexName = parentOrderUniqueIndexName(tableName)
  await pool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS "${indexName}" ON "${tableName}" ("_parent_id", "_order")`,
  )
}

async function ensureEnum(pool: PgPool, enumName: string, values: readonly string[]): Promise<void> {
  if (await enumExists(pool, enumName)) {
    console.log(`Enum ${enumName} already exists.`)
    return
  }
  const labels = values.map((value) => `'${value}'`).join(', ')
  await pool.query(`CREATE TYPE "public"."${enumName}" AS ENUM(${labels})`)
  console.log(`Created enum ${enumName}`)
}

function asRows(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
  }
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown
      return asRows(parsed)
    } catch {
      return []
    }
  }
  return []
}

function mapOwnerPrivate(
  entry: Record<string, unknown>,
  displayName: string,
): string | null {
  if (typeof entry.ownerPrivate === 'string') {
    const trimmed = entry.ownerPrivate.trim()
    return trimmed || null
  }
  // Pre-array JSON stored a checkbox, not a name. `true` means we know the
  // internal holder — copy displayName when it is an actual name.
  if (entry.ownerPrivate === true) {
    const name = displayName.trim()
    if (name && name.toLowerCase() !== 'private collection') return name
  }
  return null
}

function stableRowId(prefix: string, parentId: number, index: number, existing: unknown): string {
  if (typeof existing === 'string' && existing) return existing
  return `${prefix}-${parentId}-${index + 1}`
}

function mapEventType(raw: unknown): 'acquisition' | 'transfer' | 'consignment' {
  if (raw === 'transfer' || raw === 'consignment') return raw
  return 'acquisition'
}

function mapClaimStatus(raw: unknown): 'unclaimed' | 'claimed-pending' | 'claimed-confirmed' {
  if (raw === 'claimed-pending') return 'claimed-pending'
  if (raw === 'claimed' || raw === 'claimed-confirmed') return 'claimed-confirmed'
  return 'unclaimed'
}

async function createOwnershipTable(pool: PgPool): Promise<void> {
  if (await tableExists(pool, OWNERSHIP_TABLE)) {
    console.log(`Table ${OWNERSHIP_TABLE} already exists.`)
    return
  }

  await ensureEnum(pool, EVENT_TYPE_ENUM, ['acquisition', 'transfer', 'consignment'])
  await ensureEnum(pool, CLAIM_STATUS_ENUM, ['unclaimed', 'claimed-pending', 'claimed-confirmed'])
  await ensureEnum(pool, SALE_CURRENCY_ENUM, ['EUR', 'USD', 'GBP', 'CHF', 'other'])

  await pool.query(`
    CREATE TABLE "public"."${OWNERSHIP_TABLE}" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" character varying NOT NULL,
      "event_type" "public"."${EVENT_TYPE_ENUM}" DEFAULT 'acquisition',
      "actor_id" integer,
      "owner_private" character varying,
      "display_name" character varying DEFAULT 'Private collection',
      "collector_visible" boolean DEFAULT false,
      "date_acquired" character varying,
      "date_relinquished" character varying,
      "place_city" character varying,
      "place_country" character varying,
      "claim_status" "public"."${CLAIM_STATUS_ENUM}" DEFAULT 'unclaimed',
      "notes" character varying,
      "sale_sale_date" timestamp(3) with time zone,
      "sale_sale_price" numeric,
      "sale_sale_currency" "public"."${SALE_CURRENCY_ENUM}" DEFAULT 'EUR',
      "sale_exchange_rate_to_eur" numeric,
      "sale_buyer_private" character varying,
      "sale_buyer_city" character varying,
      "sale_channel" character varying,
      "sale_gallery_name" character varying,
      "sale_auction_house" character varying,
      "sale_invoice_reference" character varying,
      "sale_commission_rate" numeric,
      "sale_net_to_artist" numeric,
      "sale_vat_applicable" boolean DEFAULT false,
      "sale_vat_rate" numeric,
      "sale_edition_number" character varying,
      "sale_notes" character varying,
      CONSTRAINT "${OWNERSHIP_TABLE}_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "${OWNERSHIP_TABLE}_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."artworks"("id") ON DELETE CASCADE,
      CONSTRAINT "${OWNERSHIP_TABLE}_actor_id_fk"
        FOREIGN KEY ("actor_id") REFERENCES "public"."people"("id") ON DELETE SET NULL
    )
  `)
  await pool.query(
    `CREATE INDEX "${OWNERSHIP_TABLE}_order_idx" ON "public"."${OWNERSHIP_TABLE}" USING btree ("_order")`,
  )
  await pool.query(
    `CREATE INDEX "${OWNERSHIP_TABLE}_parent_id_idx" ON "public"."${OWNERSHIP_TABLE}" USING btree ("_parent_id")`,
  )
  console.log(`Created table ${OWNERSHIP_TABLE}`)
}

async function createLoanTable(pool: PgPool): Promise<void> {
  if (await tableExists(pool, LOAN_TABLE)) {
    console.log(`Table ${LOAN_TABLE} already exists.`)
    return
  }

  await pool.query(`
    CREATE TABLE "public"."${LOAN_TABLE}" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" character varying NOT NULL,
      "institution" character varying NOT NULL,
      "date_out" timestamp(3) with time zone,
      "date_returned" timestamp(3) with time zone,
      "event_id" integer,
      "notes" character varying,
      CONSTRAINT "${LOAN_TABLE}_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "${LOAN_TABLE}_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."artworks"("id") ON DELETE CASCADE,
      CONSTRAINT "${LOAN_TABLE}_event_id_fk"
        FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL
    )
  `)
  await pool.query(
    `CREATE INDEX "${LOAN_TABLE}_order_idx" ON "public"."${LOAN_TABLE}" USING btree ("_order")`,
  )
  await pool.query(
    `CREATE INDEX "${LOAN_TABLE}_parent_id_idx" ON "public"."${LOAN_TABLE}" USING btree ("_parent_id")`,
  )
  console.log(`Created table ${LOAN_TABLE}`)
}

async function createConfidenceTable(pool: PgPool): Promise<void> {
  if (await tableExists(pool, CONFIDENCE_TABLE)) {
    console.log(`Table ${CONFIDENCE_TABLE} already exists.`)
    return
  }

  await ensureEnum(pool, CONFIDENCE_ENUM, [
    'documented-fact',
    'credible-inference',
    'institutional-assertion',
    'speculation',
  ])

  await pool.query(`
    CREATE TABLE "public"."${CONFIDENCE_TABLE}" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" character varying NOT NULL,
      "claim" character varying NOT NULL,
      "evidence_basis" character varying,
      "confidence_level" "public"."${CONFIDENCE_ENUM}" NOT NULL,
      "related_ownership_id" character varying,
      CONSTRAINT "${CONFIDENCE_TABLE}_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "${CONFIDENCE_TABLE}_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."artworks"("id") ON DELETE CASCADE
    )
  `)
  await pool.query(
    `CREATE INDEX "${CONFIDENCE_TABLE}_order_idx" ON "public"."${CONFIDENCE_TABLE}" USING btree ("_order")`,
  )
  await pool.query(
    `CREATE INDEX "${CONFIDENCE_TABLE}_parent_id_idx" ON "public"."${CONFIDENCE_TABLE}" USING btree ("_parent_id")`,
  )
  console.log(`Created table ${CONFIDENCE_TABLE}`)
}

async function addPersonIdColumn(pool: PgPool, tableName: string): Promise<void> {
  if (!(await tableExists(pool, tableName))) {
    console.log(`Table ${tableName} missing — skipping person_id (Payload will create on first push/script).`)
    return
  }
  if (await columnExists(pool, tableName, 'person_id')) {
    console.log(`${tableName}.person_id already exists.`)
    return
  }
  await pool.query(`ALTER TABLE "public"."${tableName}" ADD COLUMN "person_id" integer`)
  await pool.query(
    `ALTER TABLE "public"."${tableName}"
     ADD CONSTRAINT "${tableName}_person_id_people_id_fk"
     FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE SET NULL`,
  )
  await pool.query(
    `CREATE INDEX "${tableName}_person_id_idx" ON "public"."${tableName}" USING btree ("person_id")`,
  )
  console.log(`Added ${tableName}.person_id`)
}

async function migrateJsonRows(pool: PgPool): Promise<void> {
  await ensureCopyMarkerTable(pool)
  const skip = jsonCopySkipReason({
    markerExists: await copyMarkerExists(pool),
    ownershipRows: await tableRowCount(pool, OWNERSHIP_TABLE),
    loanRows: await tableRowCount(pool, LOAN_TABLE),
    confidenceRows: await tableRowCount(pool, CONFIDENCE_TABLE),
  })
  if (skip === 'marker') {
    console.log(
      `Json copy already completed (marker ${PROVENANCE_COPY_MARKER_ID}) — skip jsonb → arrays.`,
    )
    return
  }
  if (skip === 'existing-rows') {
    console.log(
      'Destination array tables already have rows — skip jsonb → arrays (refusing a second copy).',
    )
    await writeCopyMarker(pool)
    return
  }

  if (!(await columnExists(pool, 'artworks', 'ownership_history'))) {
    console.log('artworks.ownership_history jsonb already gone — skip json copy.')
    await writeCopyMarker(pool)
    return
  }

  const { rows } = await pool.query(`
    SELECT id, ownership_history, loan_history, provenance_confidence_layer
    FROM artworks
  `)

  let ownershipCount = 0
  let loanCount = 0
  let claimCount = 0

  for (const row of rows) {
    const parentId = row.id as number

    const ownershipRows = asRows(row.ownership_history)
    for (const [index, entry] of ownershipRows.entries()) {
      const city =
        typeof entry.city === 'string'
          ? entry.city
          : entry.place && typeof entry.place === 'object'
            ? String((entry.place as { city?: unknown }).city ?? '')
            : ''
      const displayName =
        typeof entry.displayName === 'string' ? entry.displayName : 'Private collection'
      await pool.query(
        `INSERT INTO "${OWNERSHIP_TABLE}" (
           "_order", "_parent_id", "id", "event_type", "owner_private", "display_name",
           "collector_visible", "date_acquired", "date_relinquished", "place_city",
           "claim_status", "notes"
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT ("_parent_id", "_order") DO NOTHING`,
        [
          index + 1,
          parentId,
          stableRowId('ow', parentId, index, entry.id),
          mapEventType(entry.eventType),
          mapOwnerPrivate(entry, displayName),
          displayName,
          entry.collectorVisible === true,
          typeof entry.dateAcquired === 'string' ? entry.dateAcquired : null,
          typeof entry.dateRelinquished === 'string' ? entry.dateRelinquished : null,
          city || null,
          mapClaimStatus(entry.claimStatus),
          typeof entry.notes === 'string' ? entry.notes : null,
        ],
      )
      ownershipCount += 1
    }

    const loanRows = asRows(row.loan_history)
    for (const [index, entry] of loanRows.entries()) {
      const institution = typeof entry.institution === 'string' ? entry.institution.trim() : ''
      if (!institution) continue
      const eventId =
        typeof entry.eventId === 'number'
          ? entry.eventId
          : typeof entry.event === 'number'
            ? entry.event
            : null
      await pool.query(
        `INSERT INTO "${LOAN_TABLE}" (
           "_order", "_parent_id", "id", "institution", "date_out", "date_returned", "event_id", "notes"
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT ("_parent_id", "_order") DO NOTHING`,
        [
          index + 1,
          parentId,
          stableRowId('loan', parentId, index, entry.id),
          institution,
          typeof entry.dateOut === 'string' ? entry.dateOut : null,
          typeof entry.dateReturned === 'string' ? entry.dateReturned : null,
          eventId,
          typeof entry.notes === 'string' ? entry.notes : null,
        ],
      )
      loanCount += 1
    }

    const claimRows = asRows(row.provenance_confidence_layer)
    for (const [index, entry] of claimRows.entries()) {
      const claim = typeof entry.claim === 'string' ? entry.claim.trim() : ''
      const level = normalizeProvenanceConfidenceLevel(entry.confidenceLevel)
      if (!claim || !level) continue
      await pool.query(
        `INSERT INTO "${CONFIDENCE_TABLE}" (
           "_order", "_parent_id", "id", "claim", "evidence_basis", "confidence_level", "related_ownership_id"
         ) VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT ("_parent_id", "_order") DO NOTHING`,
        [
          index + 1,
          parentId,
          stableRowId('pc', parentId, index, entry.id),
          claim,
          typeof entry.evidenceBasis === 'string' ? entry.evidenceBasis : null,
          level,
          typeof entry.relatedOwnershipId === 'string' ? entry.relatedOwnershipId : null,
        ],
      )
      claimCount += 1
    }
  }

  console.log(
    `Copied jsonb → arrays: ownership ${ownershipCount}, loans ${loanCount}, confidence ${claimCount}`,
  )
  await writeCopyMarker(pool)
}

async function main() {
  const payload = await getPayload({ config })
  const pool = getPgPool(payload)

  await createOwnershipTable(pool)
  await createLoanTable(pool)
  await createConfidenceTable(pool)
  await ensureUniqueParentOrder(pool, OWNERSHIP_TABLE)
  await ensureUniqueParentOrder(pool, LOAN_TABLE)
  await ensureUniqueParentOrder(pool, CONFIDENCE_TABLE)
  await migrateJsonRows(pool)
  await addPersonIdColumn(pool, 'events_collaborators')
  await addPersonIdColumn(pool, 'events_co_speakers')

  console.log('Schema reconciliation provenance migration complete.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
