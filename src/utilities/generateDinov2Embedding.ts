/** Expected DINOv2 Large embedding width for `artworks.dinov2_embedding` (pgvector). */
export const DINOV2_EMBEDDING_DIMENSIONS = 1024 as const

export type Dinov2EmbeddingResponse = {
  embedding: number[]
}

/**
 * Calls a server-side DINOv2 embedding endpoint with an image URL.
 *
 * Configure `DINOV2_EMBEDDING_URL` (POST). Optional `DINOV2_EMBEDDING_API_KEY`
 * is sent as `Authorization: Bearer …` when set.
 *
 * Endpoint must return JSON: `{ "embedding": number[] }` with length 1024.
 */
export async function generateDinov2Embedding(imageUrl: string): Promise<number[]> {
  const endpoint = process.env.DINOV2_EMBEDDING_URL
  if (!endpoint) {
    throw new Error('DINOV2_EMBEDDING_URL is not set')
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  const key = process.env.DINOV2_EMBEDDING_API_KEY
  if (key) {
    headers.Authorization = `Bearer ${key}`
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ image_url: imageUrl, imageUrl }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`DINOv2 embedding request failed: ${res.status} ${body.slice(0, 200)}`)
  }

  const data = (await res.json()) as Dinov2EmbeddingResponse
  if (!Array.isArray(data.embedding) || data.embedding.length !== DINOV2_EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Invalid embedding: expected ${DINOV2_EMBEDDING_DIMENSIONS} numbers, got ${Array.isArray(data.embedding) ? data.embedding.length : 'non-array'}`,
    )
  }

  return data.embedding
}
