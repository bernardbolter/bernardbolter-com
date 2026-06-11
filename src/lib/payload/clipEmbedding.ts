import { getPayload } from 'payload'
import config from '@payload-config'

import { getPool } from '@/lib/payload/getPool'
import { CLIP_EMBEDDING_DIMENSIONS } from '@/utilities/generateClipEmbedding'

function parseVectorText(value: string): number[] | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (!Array.isArray(parsed)) return null
    if (parsed.length !== CLIP_EMBEDDING_DIMENSIONS) return null
    if (!parsed.every((n) => typeof n === 'number' && Number.isFinite(n))) return null
    return parsed
  } catch {
    return null
  }
}

/** Reads `clip_embedding` from Postgres (pgvector) for a published artwork id. */
export async function fetchArtworkClipEmbedding(artworkId: number): Promise<number[] | null> {
  const payload = await getPayload({ config })
  const pool = getPool(payload)

  const { rows } = await pool.query<{ clip_embedding: string | null }>(
    `SELECT clip_embedding::text AS clip_embedding
     FROM artworks
     WHERE id = $1 AND status = 'published'`,
    [artworkId],
  )

  const raw = rows[0]?.clip_embedding
  if (!raw) return null
  return parseVectorText(raw)
}
