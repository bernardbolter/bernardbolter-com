import type { CollectionConfig } from 'payload'

import { isArtistOrAdmin } from '@/access/isArtistOrAdmin'

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
      'Series-level edition tier definitions (size, substrate, edition counts). Referenced by artwork ownershipRegistry for series-structured works.',
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
          'Top-level series or sub-series this tier belongs to (e.g. Digital City Series).',
      },
    },
    {
      name: 'tierName',
      type: 'text',
      required: true,
      admin: {
        description: 'Display label, e.g. "Original edition", "Collectors print".',
      },
    },
    {
      name: 'tierOrder',
      type: 'number',
      required: true,
      admin: {
        description: '1 = most exclusive; ascending display order only.',
      },
    },
    {
      name: 'isOriginalTier',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'True when this tier IS the original artwork (e.g. DCS monumental 3+1AP), not a print of it.',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'editionSize',
          type: 'number',
          required: true,
          admin: {
            width: '50%',
            description: 'Numbered copies only — excludes AP count.',
          },
        },
        {
          name: 'apCount',
          type: 'number',
          defaultValue: 0,
          admin: {
            width: '50%',
            description: "Artist's proof count. 0 when none.",
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'widthCm',
          type: 'number',
          admin: {
            width: '50%',
            description: 'Print width in centimetres.',
          },
        },
        {
          name: 'heightCm',
          type: 'number',
          admin: {
            width: '50%',
            description: 'Print height in centimetres.',
          },
        },
      ],
    },
    {
      name: 'substrate',
      type: 'text',
      admin: {
        description: 'Physical support, e.g. Aluminium dibond, Hahnemühle Photo Rag.',
      },
    },
    {
      name: 'printTechnique',
      type: 'select',
      options: [
        { label: 'Giclée', value: 'giclee' },
        { label: 'Screenprint', value: 'screenprint' },
        { label: 'Lithograph', value: 'lithograph' },
        { label: 'Etching', value: 'etching' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'notes',
      type: 'textarea',
      admin: {
        description: 'Internal or public notes on this tier definition.',
      },
    },
  ],
}
