import type { CollectionConfig } from 'payload'

import { normalizeVideoMimeType } from '@/lib/artOfficial/mediaMime'

export const Media: CollectionConfig = {
  slug: 'media',
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
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
}
