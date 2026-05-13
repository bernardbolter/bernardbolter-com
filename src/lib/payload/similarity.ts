import { getPayload } from 'payload'
import type { Pool } from 'pg'
import config from '@payload-config'

import { CLIP_EMBEDDING_DIMENSIONS } from '@/utilities/generateClipEmbedding'

function getPool(payload: Awaited<ReturnType<typeof getPayload>>): Pool {
  const pool = (payload.db as unknown as { pool?: Pool }).pool
  if (!pool) {
    throw new Error('Postgres pool is not available on payload.db')
  }
  return pool
}

/**
 * Nearest neighbours by cosine distance (`<=>`) on `clip_embedding`.
 * `similarity` is `1 - distance` so higher is closer (matches spec examples).
 */
export async function findSimilarArtworks(
  embedding: number[],
  limit = 5,
  excludeArtworkId?: number,
): Promise<Array<{ id: number; similarity: number }>> {
  if (embedding.length !== CLIP_EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Expected ${CLIP_EMBEDDING_DIMENSIONS}-dimensional embedding, got ${embedding.length}`,
    )
  }

  const payload = await getPayload({ config })
  const pool = getPool(payload)
  const vectorLiteral = JSON.stringify(embedding)

  const { rows } = await pool.query<{ id: string; similarity: string }>(
    `SELECT id, 1 - (clip_embedding <=> $1::vector) AS similarity
     FROM artworks
     WHERE clip_embedding IS NOT NULL AND status = 'published'
       AND ($3::int IS NULL OR id <> $3::int)
     ORDER BY similarity DESC
     LIMIT $2`,
    [vectorLiteral, limit, excludeArtworkId ?? null],
  )

  return rows.map((row) => ({
    id: Number(row.id),
    similarity: Number(row.similarity),
  }))
}
