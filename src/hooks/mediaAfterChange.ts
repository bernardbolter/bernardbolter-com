import type { CollectionAfterChangeHook } from 'payload'
import { revalidatePath, revalidateTag } from 'next/cache'

function revalidateFrontendArtworkPaths(slugs: string[]) {
  revalidateTag('artworks', 'max')
  revalidatePath('/', 'layout')

  for (const slug of slugs) {
    const path = `/${slug}`
    revalidatePath(path)
    revalidatePath(`${path}/vision`)
  }
}

/** Bust frontend cache when a media file is replaced or its metadata changes. */
export const mediaAfterChange: CollectionAfterChangeHook = async ({ doc, req, operation }) => {
  if (operation !== 'create' && operation !== 'update') {
    return doc
  }

  try {
    void (async () => {
      const { docs } = await req.payload.find({
        collection: 'artworks',
        where: {
          or: [
            { primaryImage: { equals: doc.id } },
            { posterImage: { equals: doc.id } },
            { 'alternateViewImages.image': { equals: doc.id } },
            { 'detailImages.image': { equals: doc.id } },
          ],
        },
        depth: 0,
        limit: 500,
        select: { slug: true },
      })

      const slugs = docs
        .map((row) => (typeof row.slug === 'string' ? row.slug.trim() : ''))
        .filter(Boolean)

      if (slugs.length > 0) {
        revalidateFrontendArtworkPaths(slugs)
      }
    })()
  } catch {
    // No Next.js static generation store (seed scripts, tests)
  }

  return doc
}
