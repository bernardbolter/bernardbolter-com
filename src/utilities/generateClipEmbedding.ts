/** Expected CLIP / vision embedding width for `artworks.clip_embedding` (pgvector). */
export const CLIP_EMBEDDING_DIMENSIONS = 768 as const

export type ClipEmbeddingResponse = {
  embedding: number[]
}

/**
 * Calls a server-side CLIP (or compatible) embedding endpoint with an image URL.
 *
 * Configure `CLIP_EMBEDDING_URL` (POST). Optional `CLIP_EMBEDDING_API_KEY` is sent as
 * `Authorization: Bearer …` when set.
 *
 * The endpoint must return JSON: `{ "embedding": number[] }` with length 768.
 * Body sends both `image_url` and `imageUrl` for local sidecar + legacy clients.
 */
export async function generateClipEmbedding(imageUrl: string): Promise<number[]> {
  const endpoint = process.env.CLIP_EMBEDDING_URL
  if (!endpoint) {
    throw new Error('CLIP_EMBEDDING_URL is not set')
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  const key = process.env.CLIP_EMBEDDING_API_KEY
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
    throw new Error(`CLIP embedding request failed: ${res.status} ${body.slice(0, 200)}`)
  }

  const data = (await res.json()) as ClipEmbeddingResponse
  if (!Array.isArray(data.embedding) || data.embedding.length !== CLIP_EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Invalid embedding: expected ${CLIP_EMBEDDING_DIMENSIONS} numbers, got ${Array.isArray(data.embedding) ? data.embedding.length : 'non-array'}`,
    )
  }

  return data.embedding
}
