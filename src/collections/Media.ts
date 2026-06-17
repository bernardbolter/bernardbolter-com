import type { CollectionConfig } from 'payload'

import { isArtistOrAdmin } from '@/access/isArtistOrAdmin'
import { mediaAfterChange } from '@/hooks/mediaAfterChange'
import { normalizeVideoMimeType } from '@/lib/artOfficial/mediaMime'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
    create: ({ req: { user } }) => isArtistOrAdmin(user),
    update: ({ req: { user } }) => isArtistOrAdmin(user),
    delete: ({ req: { user } }) => isArtistOrAdmin(user),
  },
  upload: {
    staticDir: 'media',
    imageSizes: [
      {
        name: 'thumbnail',
        width: 300,
        height: undefined,
        position: 'centre',
      },
    ],
    adminThumbnail: 'thumbnail',
    // macOS browsers often report .mp4 as video/x-m4v; Payload sniffs the same from file bytes.
    mimeTypes: [
      'image/*',
      'video/*',
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-m4v',
      'video/m4v',
      'application/mp4',
    ],
  },
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (typeof data?.mimeType === 'string' && data.mimeType.startsWith('video/')) {
          data.mimeType = normalizeVideoMimeType(data.mimeType)
        }
        return data
      },
    ],
    afterChange: [mediaAfterChange],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
}
