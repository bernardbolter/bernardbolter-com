import { getPayload } from 'payload'
import type { Pool } from 'pg'
import config from '@payload-config'

import { CLIP_EMBEDDING_DIMENSIONS } from '@/utilities/generateClipEmbedding'
import { DINOV2_EMBEDDING_DIMENSIONS } from '@/utilities/generateDinov2Embedding'

function getPool(payload: Awaited<ReturnType<typeof getPayload>>): Pool {
  const pool = (payload.db as unknown as { pool?: Pool }).pool
  if (!pool) {
    throw new Error('Postgres pool is not available on payload.db')
  }
  return pool
}

export type SimilarityColumn = 'clip_embedding' | 'dinov2_embedding'

/**
 * Nearest neighbours by cosine distance (`<=>`) on a pgvector column.
 * `similarity` is `1 - distance` so higher is closer.
 */
export async function findSimilarArtworks(
  embedding: number[],
  limit = 5,
  excludeArtworkId?: number,
  column: SimilarityColumn = 'clip_embedding',
): Promise<Array<{ id: number; similarity: number }>> {
  const expected =
    column === 'dinov2_embedding' ? DINOV2_EMBEDDING_DIMENSIONS : CLIP_EMBEDDING_DIMENSIONS
  if (embedding.length !== expected) {
    throw new Error(`Expected ${expected}-dimensional embedding, got ${embedding.length}`)
  }

  const payload = await getPayload({ config })
  const pool = getPool(payload)
  const vectorLiteral = JSON.stringify(embedding)

  const { rows } = await pool.query<{ id: string; similarity: string }>(
    `SELECT id, 1 - (${column} <=> $1::vector) AS similarity
     FROM artworks
     WHERE ${column} IS NOT NULL AND status = 'published'
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
