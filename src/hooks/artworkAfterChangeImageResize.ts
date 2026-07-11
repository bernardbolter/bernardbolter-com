import type { CollectionAfterChangeHook } from 'payload'
import type { Artwork, Media } from '@/payload-types'

import { getArtworkOriginalImageUrl } from '@/lib/media/artworkR2Images'
import { enqueueResizeImageOnUpload } from '@/lib/queue/enqueue'

function primaryImageId(artwork: Pick<Artwork, 'primaryImage'>): number | null {
  const ref = artwork.primaryImage
  if (!ref) return null
  if (typeof ref === 'number') return ref
  if (typeof ref === 'object' && typeof ref.id === 'number') return ref.id
  return null
}

async function resolveImageUrlForResize(
  doc: Artwork,
  payload: Parameters<CollectionAfterChangeHook>[0]['req']['payload'],
): Promise<string | null> {
  const fromDoc = getArtworkOriginalImageUrl(doc)
  if (fromDoc) return fromDoc

  const mediaId = primaryImageId(doc)
  if (mediaId == null) return null

  const media = await payload.findByID({
    collection: 'media',
    id: mediaId,
    depth: 0,
  })

  return getArtworkOriginalImageUrl({ primaryImage: media as Media })
}

export const artworkAfterChangeImageResize: CollectionAfterChangeHook = async ({
  doc,
  req,
  operation,
  previousDoc,
  context,
}) => {
  if (context?.skipImageResize) return doc
  if (operation !== 'create' && operation !== 'update') return doc

  const slug = doc.slug?.trim()
  if (!slug) return doc

  const previousId = previousDoc ? primaryImageId(previousDoc as Artwork) : null
  const currentId = primaryImageId(doc as Artwork)
  const imageChanged = operation === 'create' || previousId !== currentId

  if (!imageChanged || currentId == null) return doc

  void (async () => {
    try {
      const imageUrl = await resolveImageUrlForResize(doc as Artwork, req.payload)
      if (!imageUrl) {
        req.payload.logger.warn({ msg: 'Image resize skipped: no imageUrl', id: doc.id })
        return
      }

      await enqueueResizeImageOnUpload(slug, imageUrl)
    } catch (error) {
      req.payload.logger.error({
        msg: 'Failed to enqueue resize-image-on-upload',
        id: doc.id,
        error,
      })
    }
  })()

  return doc
}
