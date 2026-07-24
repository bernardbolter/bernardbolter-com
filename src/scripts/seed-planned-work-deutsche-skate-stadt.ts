/**
 * Seed Deutsche Skate Stadt planned work via SQL
 * (docs/corpus/planned-works-schema-addendum.md Section 4).
 *
 * Avoids Payload artist.update (which hydrates bioTimeline sourceSessionRef
 * and fails when unrelated session schema columns are wrong).
 *
 * Idempotent on title match.
 *
 * Usage: npx tsx src/scripts/seed-planned-work-deutsche-skate-stadt.ts
 */
import { randomBytes } from 'crypto'
import dotenv from 'dotenv'

dotenv.config({ path: '.env', override: true })
dotenv.config({ path: '.env.local', override: true })

import { getPayload } from 'payload'
import config from '@/payload.config'

type PgPool = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
}

const TITLE = 'Deutsche Skate Stadt'

const MOTIVATING_NOTE =
  "Relaunches the Megacities series. Resolves the zoom-level problem Deutsche Stadt couldn't: city-scale satellite imagery was used instead of skatepark-scale because European resolution isn't good enough at that zoom to actually see the skateparks and places."

const BLOCKER =
  'Satellite imagery resolution in Germany/Europe insufficient at skatepark zoom level — commercial satellite coverage (Maxar, Google) concentrates higher resolution and refresh rate over the US, a structural bias also relevant to the Almadinat Alearabia vision-analysis discrepancy discussed in the same session.'

const DEUTSCHE_STADT_SLUG_CANDIDATES = [
  'deutsche-stadt',
  'deutsche-stadt-1',
  'megacities-deutsche-stadt',
]

function getPgPool(payload: Awaited<ReturnType<typeof getPayload>>): PgPool {
  const pool = (payload.db as { pool?: PgPool } | undefined)?.pool
  if (!pool) throw new Error('Postgres pool not available on payload.db')
  return pool
}

function newRowId(): string {
  return randomBytes(12).toString('hex')
}

async function main() {
  const payload = await getPayload({ config })
  const pool = getPgPool(payload)

  const { rows: artistRows } = await pool.query(
    `SELECT id FROM artists ORDER BY created_at ASC LIMIT 1`,
  )
  const artistId = artistRows[0]?.id
  if (typeof artistId !== 'number') {
    console.error('No artist record found.')
    process.exit(1)
  }

  const { rows: existing } = await pool.query(
    `SELECT id FROM artists_planned_works
     WHERE _parent_id = $1 AND lower(trim(title)) = lower(trim($2))
     LIMIT 1`,
    [artistId, TITLE],
  )
  if (existing[0]) {
    console.log(`Planned work "${TITLE}" already present — skip.`)
    process.exit(0)
  }

  const { rows: seriesRows } = await pool.query(
    `SELECT id FROM series WHERE slug = 'megacities' LIMIT 1`,
  )
  const seriesId = typeof seriesRows[0]?.id === 'number' ? seriesRows[0].id : null
  if (!seriesId) console.warn('Series megacities not found — seeding without relatedSeries.')

  let artworkId: number | null = null
  for (const slug of DEUTSCHE_STADT_SLUG_CANDIDATES) {
    const { rows } = await pool.query(`SELECT id, slug FROM artworks WHERE slug = $1 LIMIT 1`, [
      slug,
    ])
    if (typeof rows[0]?.id === 'number') {
      artworkId = rows[0].id
      console.log(`Linked related artwork ${rows[0].slug} (id ${artworkId})`)
      break
    }
  }
  if (!artworkId) {
    const { rows } = await pool.query(
      `SELECT id, title FROM artworks
       WHERE lower(title) LIKE '%deutsche stadt%'
       ORDER BY id ASC LIMIT 5`,
    )
    const exact = rows.find(
      (row) => String(row.title ?? '').trim().toLowerCase() === 'deutsche stadt',
    )
    const pick = exact ?? rows[0]
    if (typeof pick?.id === 'number') {
      artworkId = pick.id
      console.log(`Linked related artwork by title "${pick.title}" (id ${artworkId})`)
    } else {
      console.warn('Deutsche Stadt artwork not found — seeding without relatedArtworks.')
    }
  }

  const { rows: orderRows } = await pool.query(
    `SELECT COALESCE(MAX(_order), -1)::int AS max FROM artists_planned_works WHERE _parent_id = $1`,
    [artistId],
  )
  const nextOrder = Number(orderRows[0]?.max ?? -1) + 1
  const rowId = newRowId()

  await pool.query(
    `INSERT INTO artists_planned_works
      (_order, _parent_id, id, title, motivating_note, blocker, related_series_id, status, date_named, migrated_artwork_id_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'idea', $8::timestamptz, NULL)`,
    [
      nextOrder,
      artistId,
      rowId,
      TITLE,
      MOTIVATING_NOTE,
      BLOCKER,
      seriesId,
      '2026-07-24T00:00:00.000Z',
    ],
  )
  console.log(`Inserted planned work row ${rowId}`)

  if (artworkId != null) {
    await pool.query(
      `INSERT INTO artists_planned_works_rels ("order", parent_id, path, artworks_id)
       VALUES (0, $1, 'relatedArtworks', $2)`,
      [rowId, artworkId],
    )
    console.log(`Linked relatedArtworks → artwork ${artworkId}`)
  }

  console.log(`Seeded planned work "${TITLE}".`)
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
