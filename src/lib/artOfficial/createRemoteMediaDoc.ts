import type { Payload, TypedUser } from 'payload'

import { normalizeVideoMimeType } from '@/lib/artOfficial/mediaMime'
import { getPublicUrlForObjectKey } from '@/lib/studio/r2'

/** Register a file already stored in R2 as a Payload `media` document (no re-upload). */
export async function createRemoteMediaDoc(args: {
  payload: Payload
  user: TypedUser
  objectKey: string
  mimeType: string
  filesize: number
  alt: string
}) {
  const mimeType = args.mimeType.startsWith('video/')
    ? normalizeVideoMimeType(args.mimeType)
    : args.mimeType

  return args.payload.create({
    collection: 'media',
    data: {
      alt: args.alt,
      filename: args.objectKey,
      mimeType,
      filesize: args.filesize,
      url: getPublicUrlForObjectKey(args.objectKey),
    },
    overrideAccess: false,
    user: args.user,
  })
}
