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

export type ArtworkClipEmbeddingRecord = {
  embedding: number[]
  generatedAt: string | null
}

/** Reads CLIP embedding vector and generated timestamp from Postgres for an artwork id. */
export async function fetchArtworkClipEmbeddingRecord(
  artworkId: number,
): Promise<ArtworkClipEmbeddingRecord | null> {
  const payload = await getPayload({ config })
  const pool = getPool(payload)

  const { rows } = await pool.query<{
    clip_embedding: string | null
    clip_embedding_generated_at: string | Date | null
  }>(
    `SELECT clip_embedding::text AS clip_embedding,
            clip_embedding_generated_at
     FROM artworks
     WHERE id = $1`,
    [artworkId],
  )

  const row = rows[0]
  if (!row?.clip_embedding) return null

  const embedding = parseVectorText(row.clip_embedding)
  if (!embedding) return null

  const generatedAtRaw = row.clip_embedding_generated_at
  const generatedAt =
    generatedAtRaw instanceof Date
      ? generatedAtRaw.toISOString()
      : typeof generatedAtRaw === 'string' && generatedAtRaw.trim()
        ? generatedAtRaw.trim()
        : null

  return { embedding, generatedAt }
}

/** Reads `clip_embedding` from Postgres (pgvector) for an artwork id. */
export async function fetchArtworkClipEmbedding(artworkId: number): Promise<number[] | null> {
  const record = await fetchArtworkClipEmbeddingRecord(artworkId)
  return record?.embedding ?? null
}
