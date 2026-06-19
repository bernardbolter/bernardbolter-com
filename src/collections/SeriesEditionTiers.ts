import type { CollectionConfig } from 'payload'

import { isArtistOrAdmin, privateFieldAccess } from '@/access/isArtistOrAdmin'

export const SeriesEditionTiers: CollectionConfig = {
  slug: 'series-edition-tiers',
  labels: {
    singular: 'Series edition tier',
    plural: 'Series edition tiers',
  },
  admin: {
    useAsTitle: 'tierName',
    defaultColumns: ['tierName', 'series', 'tierOrder', 'editionSize', 'isOriginalTier'],
    description:
      'Series-level tier spec and the one shared Vendure Product per tier. Artwork entries relate here for name/size/substrate; ownership stays on each artwork.',
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => isArtistOrAdmin(user),
    update: ({ req: { user } }) => isArtistOrAdmin(user),
    delete: ({ req: { user } }) => isArtistOrAdmin(user),
  },
  fields: [
    {
      name: 'series',
      type: 'relationship',
      relationTo: 'series',
      required: true,
      index: true,
      admin: {
        description:
          'Top-level series or sub-series (e.g. "Mediums of Perception" within A Colorful History). Tiers apply only to artworks tagged with that exact series/sub-series.',
      },
    },
    {
      name: 'tierName',
      type: 'text',
      required: true,
    },
    {
      name: 'tierOrder',
      type: 'number',
      required: true,
      admin: {
        description: '1 = top tier. Display order only.',
      },
    },
    {
      name: 'isOriginalTier',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'True only for the tier that IS the artwork itself (DCS/Megacities "Monumental," the 3+1AP tier) — not a reproduction of it. Renders in Status & Provenance, not the Editions accordion.',
      },
    },
    {
      name: 'editionSize',
      type: 'number',
      required: true,
      admin: {
        description: 'Numbered copies only — excludes AP count.',
      },
    },
    {
      name: 'apCount',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'widthCm',
      type: 'number',
    },
    {
      name: 'heightCm',
      type: 'number',
    },
    {
      name: 'substrate',
      type: 'text',
    },
    {
      name: 'printTechnique',
      type: 'text',
    },
    {
      name: 'vendureProductId',
      type: 'text',
      access: privateFieldAccess,
      admin: {
        description:
          'The ONE Vendure Product shared by every artwork using this tier. Price is set and changed directly in Vendure against this product — not duplicated here.',
      },
    },
    {
      name: 'notes',
      type: 'textarea',
    },
  ],
}
