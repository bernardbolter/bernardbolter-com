import type { GlobalConfig } from 'payload'

import { isArtistOrAdmin } from '@/access/isArtistOrAdmin'

/**
 * Site-wide config for the curated print set builder (formerly RIBBA).
 * One Vendure product covers the whole pack; selected SmallPrint IDs go on the order line.
 */
export const PrintSetConfig: GlobalConfig = {
  slug: 'print-set-config',
  label: 'Print set config',
  admin: {
    description:
      'Print set builder: Vendure product, pack size, and frame display labels. Not per SmallPrint row.',
  },
  access: {
    read: () => true,
    update: ({ req: { user } }) => isArtistOrAdmin(user),
  },
  fields: [
    {
      name: 'vendureProductId',
      type: 'text',
      required: true,
      admin: {
        description: 'Single Vendure product ID for the full print set (fixed price).',
      },
    },
    {
      name: 'packSize',
      type: 'number',
      required: true,
      defaultValue: 5,
      min: 1,
      max: 20,
      admin: { description: 'Number of prints the customer selects per order.' },
    },
    {
      name: 'frameLabel',
      type: 'text',
      localized: true,
      admin: {
        description: 'Display name of the frame format (e.g. current product name on the site).',
      },
    },
    {
      name: 'frameNotes',
      type: 'richText',
      localized: true,
      admin: {
        description: 'Public-facing notes about the frame / border treatment at fulfilment.',
      },
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description: 'When off, the set builder is hidden on the storefront.',
      },
    },
  ],
}
