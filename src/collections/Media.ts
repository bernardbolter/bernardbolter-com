import type { CollectionConfig } from 'payload'

import { isArtistOrAdmin } from '@/access/isArtistOrAdmin'
import { mediaAfterChange } from '@/hooks/mediaAfterChange'
import {
  normalizeAudioMimeType,
  normalizeVideoMimeType,
} from '@/lib/artOfficial/mediaMime'

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
    // Studio inbox uploads register files already on disk (no req.file / no remote url fetch).
    filesRequiredOnCreate: false,
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
      'audio/*',
      'audio/mpeg',
      'audio/mp4',
      'audio/x-m4a',
      'audio/m4a',
      'audio/wav',
      'audio/x-wav',
      'audio/wave',
      'audio/aac',
      'audio/ogg',
      'audio/flac',
      'audio/aiff',
      'audio/x-aiff',
      'audio/x-caf',
    ],
  },
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (typeof data?.mimeType !== 'string') return data
        if (data.mimeType.startsWith('video/')) {
          data.mimeType = normalizeVideoMimeType(data.mimeType)
        } else if (data.mimeType.startsWith('audio/')) {
          data.mimeType = normalizeAudioMimeType(data.mimeType)
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
