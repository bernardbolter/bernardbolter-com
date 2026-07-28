import type { Payload } from 'payload'

import type { ReasoningEmbeddingSourceType } from '@/lib/artwork/reasoningEmbeddingSource'
import { getPool } from '@/lib/payload/getPool'
import { REASONING_TEXT_EMBEDDING_DIMENSIONS } from '@/utilities/generateReasoningTextEmbedding'

/**
 * Writes reasoning-text pgvector + metadata via SQL so Payload JSON field
 * paths do not corrupt the vector column. Does not run collection hooks.
 */
export async function persistArtworkReasoningEmbedding(
  payload: Payload,
  artworkId: number,
  embedding: number[],
  source: ReasoningEmbeddingSourceType,
  generatedAt: Date = new Date(),
): Promise<void> {
  if (embedding.length !== REASONING_TEXT_EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Reasoning embedding must have length ${REASONING_TEXT_EMBEDDING_DIMENSIONS}, got ${embedding.length}`,
    )
  }

  const pool = getPool(payload)
  await pool.query(
    `UPDATE artworks
     SET reasoning_text_embedding = $1::vector,
         reasoning_text_embedding_generated_at = $3,
         reasoning_text_embedding_source = $4
     WHERE id = $2`,
    [JSON.stringify(embedding), artworkId, generatedAt.toISOString(), source],
  )
}
