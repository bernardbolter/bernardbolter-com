import { getPayload } from 'payload'
import config from '@payload-config'

import { fetchArtworkClipEmbedding } from '@/lib/payload/clipEmbedding'
import { findSimilarArtworks } from '@/lib/payload/similarity'
import type { Artwork } from '@/payload-types'

export type SimilarArtworkCard = Pick<Artwork, 'id' | 'title' | 'slug' | 'primaryImage' | 'posterImage'> & {
  similarity?: number
}

export async function getSimilarArtworksForPage(
  artworkId: number,
  limit = 3,
): Promise<SimilarArtworkCard[]> {
  const embedding = await fetchArtworkClipEmbedding(artworkId)
  if (!embedding) return []

  const neighbours = await findSimilarArtworks(embedding, limit, artworkId)
  if (!neighbours.length) return []

  const payload = await getPayload({ config })
  const ids = neighbours.map((row) => row.id)
  const result = await payload.find({
    collection: 'artworks',
    where: { id: { in: ids } },
    limit: ids.length,
    depth: 1,
    overrideAccess: false,
  })

  const byId = new Map(
    result.docs
      .filter((doc): doc is Artwork => Boolean(doc && typeof doc.id === 'number'))
      .map((doc) => [doc.id, doc]),
  )
  const cards: SimilarArtworkCard[] = []
  for (const row of neighbours) {
    const doc = byId.get(row.id)
    if (!doc) continue
    cards.push({
      id: doc.id,
      title: doc.title,
      slug: doc.slug,
      primaryImage: doc.primaryImage,
      posterImage: doc.posterImage,
      similarity: row.similarity,
    })
  }
  return cards
}

export async function artworkHasClipEmbedding(artworkId: number): Promise<boolean> {
  const embedding = await fetchArtworkClipEmbedding(artworkId)
  return Boolean(embedding?.length)
}
