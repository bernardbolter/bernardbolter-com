import type { CollectionConfig, Where } from 'payload'

import { isArtistOrAdmin } from '@/access/isArtistOrAdmin'
import { validateSquareArtwork } from '@/hooks/smallPrintSquareArtwork'

export const SmallPrints: CollectionConfig = {
  slug: 'small-prints',
  labels: { singular: 'Small print', plural: 'Small prints' },
  admin: {
    defaultColumns: ['artwork', 'available', 'updatedAt'],
    description:
      'Curated square paintings available in the print set builder. Vendure product ID is on Print set config global — not per row.',
  },
  access: {
    read: ({ req: { user } }) => {
      if (isArtistOrAdmin(user)) return true
      const where: Where = { available: { equals: true } }
      return where
    },
    create: ({ req: { user } }) => isArtistOrAdmin(user),
    update: ({ req: { user } }) => isArtistOrAdmin(user),
    delete: ({ req: { user } }) => isArtistOrAdmin(user),
  },
  fields: [
    {
      name: 'artwork',
      type: 'relationship',
      relationTo: 'artworks',
      required: true,
      unique: true,
      validate: validateSquareArtwork,
      admin: {
        description:
          'Source painting — must have orientation “square”. Title, city, series, and primaryImage come from this relation.',
      },
    },
    {
      name: 'available',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description: 'Whether this print is selectable in the set builder.',
      },
    },
  ],
}
