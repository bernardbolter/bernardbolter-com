import type { Payload } from 'payload'

import { CLIP_EMBEDDING_DIMENSIONS } from '@/utilities/generateClipEmbedding'
import { getPool } from '@/lib/payload/getPool'

/**
 * Writes `clip_embedding` via parameterized SQL so pgvector sees a proper `vector(1536)`
 * value (Payload’s JSON field path is not reliable for this column type).
 *
 * Does not run collection hooks — avoids re-entering `afterChange` embedding logic.
 */
export async function persistArtworkClipEmbedding(
  payload: Payload,
  artworkId: number,
  embedding: number[],
): Promise<void> {
  if (embedding.length !== CLIP_EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Embedding must have length ${CLIP_EMBEDDING_DIMENSIONS}, got ${embedding.length}`,
    )
  }

  const pool = getPool(payload)
  await pool.query(
    `UPDATE artworks SET clip_embedding = $1::vector WHERE id = $2`,
    [JSON.stringify(embedding), artworkId],
  )
}
