import config from '@payload-config'
import { getPool } from '@/lib/payload/getPool'
import { beforeAll, describe, expect, it } from 'vitest'
import { getPayload } from 'payload'

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('Payload access control (anonymous)', () => {
  let schemaHasArtworkRecordOrigin = false

  beforeAll(async () => {
    const payload = await getPayload({ config })
    const pool = getPool(payload)
    const { rows } = await pool.query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'artworks'
          AND column_name = 'record_origin'
      ) AS exists`,
    )
    schemaHasArtworkRecordOrigin = Boolean(rows[0]?.exists)
  })

  it('artworks find uses published + artist-catalogued constraint', async () => {
    if (!schemaHasArtworkRecordOrigin) return

    const payload = await getPayload({ config })
    const res = await payload.find({
      collection: 'artworks',
      limit: 5,
      overrideAccess: false,
    })
    for (const doc of res.docs) {
      expect(doc.status).toBe('published')
      expect(doc.recordOrigin).toBe('artist-catalogued')
    }
  })

  it('acquisitionPrice is not returned to anonymous local API reads', async () => {
    if (!schemaHasArtworkRecordOrigin) return

    const payload = await getPayload({ config })
    const res = await payload.find({
      collection: 'artworks',
      limit: 1,
      overrideAccess: false,
    })
    const doc = res.docs[0]
    if (!doc) return
    expect(doc.acquisitionPrice).toBeUndefined()
  })
})
