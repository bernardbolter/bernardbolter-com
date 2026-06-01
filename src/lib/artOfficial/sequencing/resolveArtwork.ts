import type { Payload } from 'payload'

import type { User } from '@/payload-types'

export async function findArtworkBySlug(
  payload: Payload,
  slug: string,
  user: User,
): Promise<{ id: number; slug: string; sortIndex?: number | null; title?: string | null } | null> {
  const { docs } = await payload.find({
    collection: 'artworks',
    where: { slug: { equals: slug.trim() } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user: user as never,
    select: { slug: true, sortIndex: true, title: true },
  })
  return docs[0] ?? null
}

export async function resolveTargetArtworkSlug(
  payload: Payload,
  user: User,
  session: { artworkRecord?: unknown },
  artworkSlug?: string,
): Promise<string | null> {
  if (artworkSlug?.trim()) return artworkSlug.trim()

  const record = session.artworkRecord
  const id =
    typeof record === 'object' && record !== null && 'id' in record
      ? (record as { id: number }).id
      : typeof record === 'number'
        ? record
        : null

  if (id == null) return null

  const doc = await payload.findByID({
    collection: 'artworks',
    id,
    depth: 0,
    overrideAccess: false,
    user: user as never,
    select: { slug: true },
  })
  return doc.slug ?? null
}
