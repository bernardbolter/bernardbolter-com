/** Expected reasoning-text embedding width for `artworks.reasoning_text_embedding`. */
export const REASONING_TEXT_EMBEDDING_DIMENSIONS = 1536 as const

export const REASONING_TEXT_EMBEDDING_MODEL_DEFAULT = 'text-embedding-3-small' as const

export type ReasoningTextEmbeddingResponse = {
  embedding?: number[]
  data?: Array<{ embedding?: number[] }>
}

/**
 * Calls an OpenAI-compatible text embedding endpoint.
 *
 * Configure `REASONING_TEXT_EMBEDDING_URL` (POST). Optional
 * `REASONING_TEXT_EMBEDDING_API_KEY` is sent as `Authorization: Bearer …`.
 * Optional `REASONING_TEXT_EMBEDDING_MODEL` defaults to text-embedding-3-small.
 *
 * Accepts either OpenAI `{ data: [{ embedding }] }` or sidecar `{ embedding }` JSON.
 */
export async function generateReasoningTextEmbedding(text: string): Promise<number[]> {
  const endpoint = process.env.REASONING_TEXT_EMBEDDING_URL
  if (!endpoint) {
    throw new Error('REASONING_TEXT_EMBEDDING_URL is not set')
  }

  const model =
    process.env.REASONING_TEXT_EMBEDDING_MODEL?.trim() || REASONING_TEXT_EMBEDDING_MODEL_DEFAULT

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  const key = process.env.REASONING_TEXT_EMBEDDING_API_KEY
  if (key) {
    headers.Authorization = `Bearer ${key}`
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      input: text,
      // Sidecar-friendly aliases
      text,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(
      `Reasoning-text embedding request failed: ${res.status} ${body.slice(0, 200)}`,
    )
  }

  const data = (await res.json()) as ReasoningTextEmbeddingResponse
  const embedding = Array.isArray(data.embedding)
    ? data.embedding
    : data.data?.[0]?.embedding

  if (!Array.isArray(embedding) || embedding.length !== REASONING_TEXT_EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Invalid reasoning embedding: expected ${REASONING_TEXT_EMBEDDING_DIMENSIONS} numbers, got ${
        Array.isArray(embedding) ? embedding.length : 'non-array'
      }`,
    )
  }

  return embedding
}
