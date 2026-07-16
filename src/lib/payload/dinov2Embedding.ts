import { getPayload } from 'payload'
import config from '@payload-config'

import { getPool } from '@/lib/payload/getPool'
import { DINOV2_EMBEDDING_DIMENSIONS } from '@/utilities/generateDinov2Embedding'

function parseVectorText(value: string, dimensions: number): number[] | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (!Array.isArray(parsed)) return null
    if (parsed.length !== dimensions) return null
    if (!parsed.every((n) => typeof n === 'number' && Number.isFinite(n))) return null
    return parsed
  } catch {
    return null
  }
}

export type ArtworkDinov2EmbeddingRecord = {
  embedding: number[]
  generatedAt: string | null
}

export async function fetchArtworkDinov2EmbeddingRecord(
  artworkId: number,
): Promise<ArtworkDinov2EmbeddingRecord | null> {
  const payload = await getPayload({ config })
  const pool = getPool(payload)

  const { rows } = await pool.query<{
    dinov2_embedding: string | null
    dinov2_embedding_generated_at: string | Date | null
  }>(
    `SELECT dinov2_embedding::text AS dinov2_embedding,
            dinov2_embedding_generated_at
     FROM artworks
     WHERE id = $1`,
    [artworkId],
  )

  const row = rows[0]
  if (!row?.dinov2_embedding) return null

  const embedding = parseVectorText(row.dinov2_embedding, DINOV2_EMBEDDING_DIMENSIONS)
  if (!embedding) return null

  const generatedAtRaw = row.dinov2_embedding_generated_at
  const generatedAt =
    generatedAtRaw instanceof Date
      ? generatedAtRaw.toISOString()
      : typeof generatedAtRaw === 'string' && generatedAtRaw.trim()
        ? generatedAtRaw.trim()
        : null

  return { embedding, generatedAt }
}

export async function fetchArtworkDinov2Embedding(artworkId: number): Promise<number[] | null> {
  const record = await fetchArtworkDinov2EmbeddingRecord(artworkId)
  return record?.embedding ?? null
}
