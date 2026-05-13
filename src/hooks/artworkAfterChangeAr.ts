import type { CollectionAfterChangeHook } from 'payload'

import { getPool } from '@/lib/payload/getPool'

/**
 * Stub AR asset pipeline: when `arEnabled` and dimensions + primary image exist,
 * stamps `ar_last_generated` and placeholder URLs (replace with real USDZ/GLB generation).
 * Uses direct SQL to avoid re-entering afterChange hooks.
 */
export const artworkAfterChangeAr: CollectionAfterChangeHook = async ({
  doc,
  req,
  operation,
  context,
}) => {
  if (context?.skipArUpdate) {
    return doc
  }
  if (operation !== 'create' && operation !== 'update') {
    return doc
  }
  if (!doc.arEnabled) {
    return doc
  }
  if (!doc.primaryImage || !doc.slug) {
    return doc
  }
  const w = typeof doc.widthMm === 'number' ? doc.widthMm : null
  const h = typeof doc.heightMm === 'number' ? doc.heightMm : null
  if (w == null || h == null) {
    return doc
  }

  const base = (process.env.NEXT_PUBLIC_IMAGE_DOMAIN ?? '').replace(/\/$/, '')
  if (!base) {
    req.payload.logger.warn({ msg: 'AR stub skipped: NEXT_PUBLIC_IMAGE_DOMAIN unset', id: doc.id })
    return doc
  }

  const usdz = `${base}/ar/${doc.slug}.usdz`
  const glb = `${base}/ar/${doc.slug}.glb`

  void (async () => {
    try {
      const pool = getPool(req.payload)
      await pool.query(
        `UPDATE artworks SET ar_model_url = $1, ar_model_glb_url = $2, ar_last_generated = now() WHERE id = $3`,
        [usdz, glb, doc.id],
      )
    } catch (err) {
      req.payload.logger.error({ msg: 'AR stub update failed', id: doc.id, err })
    }
  })()

  return doc
}
