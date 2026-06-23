import type { GlobalConfig } from 'payload'

import { isArtistOrAdmin } from '@/access/isArtistOrAdmin'

/**
 * Art/Official site settings — custom artwork medium options added via Quick Upload.
 */
export const ArtOfficialSettings: GlobalConfig = {
  slug: 'art-official-settings',
  label: 'Art/Official settings',
  admin: {
    description:
      'Custom medium labels and edition vocabulary added from admin appear here and in related selects.',
  },
  access: {
    read: () => true,
    update: ({ req: { user } }) => isArtistOrAdmin(user),
  },
  fields: [
    {
      name: 'customMediums',
      type: 'array',
      labels: { singular: 'Custom medium', plural: 'Custom media' },
      admin: {
        description:
          'Extra medium select options. Managed automatically when you add a new medium in Quick Upload.',
      },
      fields: [
        {
          name: 'value',
          type: 'text',
          required: true,
          admin: { description: 'Stable slug stored on artworks.medium' },
        },
        {
          name: 'label',
          type: 'text',
          required: true,
          admin: { description: 'Label shown in dropdowns' },
        },
        {
          name: 'aatUri',
          type: 'text',
          admin: {
            description:
              'Optional Getty AAT URI for this medium — used in JSON-LD artMedium as DefinedTerm when set.',
          },
        },
      ],
    },
    {
      name: 'customEditionSubstrates',
      type: 'array',
      labels: { singular: 'Custom substrate', plural: 'Custom edition substrates' },
      admin: {
        description:
          'Extra substrate options for series edition tiers and ownership registry. Also managed when you add a new substrate from a tier field.',
      },
      fields: [
        {
          name: 'value',
          type: 'text',
          required: true,
          admin: { description: 'Stable slug stored on edition tier records' },
        },
        {
          name: 'label',
          type: 'text',
          required: true,
          admin: { description: 'Label shown in dropdowns and on the artwork page' },
        },
      ],
    },
    {
      name: 'customEditionPrintTechniques',
      type: 'array',
      labels: { singular: 'Custom print technique', plural: 'Custom print techniques' },
      admin: {
        description:
          'Extra print technique options for series edition tiers and ownership registry. Also managed when you add a new technique from a tier field.',
      },
      fields: [
        {
          name: 'value',
          type: 'text',
          required: true,
          admin: { description: 'Stable slug stored on edition tier records' },
        },
        {
          name: 'label',
          type: 'text',
          required: true,
          admin: { description: 'Label shown in dropdowns and on the artwork page' },
        },
      ],
    },
  ],
}
