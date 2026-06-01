import type { CollectionBeforeChangeHook } from 'payload'

/**
 * When isMicroSelection is set on a capture photo, clear it on sibling photos
 * for the same parent artwork so only one Micro exists per city composition.
 */
export const dcsCapturePhotosBeforeChange: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  const isMicro = data?.isMicroSelection ?? originalDoc?.isMicroSelection
  if (!isMicro) return data

  const parentId =
    data?.parentArtwork ??
    (typeof originalDoc?.parentArtwork === 'object'
      ? originalDoc.parentArtwork?.id
      : originalDoc?.parentArtwork)
  const currentId = originalDoc?.id

  if (parentId == null) return data

  const siblings = await req.payload.find({
    collection: 'dcs-capture-photos',
    where: {
      and: [
        { parentArtwork: { equals: parentId } },
        { isMicroSelection: { equals: true } },
        ...(currentId != null ? [{ id: { not_equals: currentId } }] : []),
      ],
    },
    limit: 50,
    depth: 0,
    overrideAccess: true,
  })

  for (const sibling of siblings.docs) {
    await req.payload.update({
      collection: 'dcs-capture-photos',
      id: sibling.id,
      data: { isMicroSelection: false },
      req,
      overrideAccess: true,
      context: { skipMicroGuard: true },
    })
  }

  return data
}
