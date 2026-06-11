import { getPayload } from 'payload'
import config from '@payload-config'

import { fetchArtworkClipEmbedding } from '@/lib/payload/clipEmbedding'
import { findSimilarArtworks } from '@/lib/payload/similarity'
import type { Artwork } from '@/payload-types'

export type SimilarArtworkCard = Pick<Artwork, 'id' | 'title' | 'slug' | 'primaryImage' | 'posterImage'>

export async function getSimilarArtworksForPage(
  artworkId: number,
  limit = 4,
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

  const byId = new Map(result.docs.map((doc) => [doc.id, doc]))
  return neighbours
    .map((row) => byId.get(row.id))
    .filter((doc): doc is Artwork => Boolean(doc))
    .map((doc) => ({
      id: doc.id,
      title: doc.title,
      slug: doc.slug,
      primaryImage: doc.primaryImage,
      posterImage: doc.posterImage,
    }))
}

export async function artworkHasClipEmbedding(artworkId: number): Promise<boolean> {
  const embedding = await fetchArtworkClipEmbedding(artworkId)
  return Boolean(embedding?.length)
}
