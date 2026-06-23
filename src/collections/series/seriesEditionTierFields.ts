import type { Field } from 'payload'

import { privateFieldAccess } from '@/access/isArtistOrAdmin'
import {
  editionTierDimensionFields,
  editionTierPrintTechniqueField,
  editionTierSubstrateField,
} from '@/collections/artworks/editionTierSpecFields'

/** Embedded edition tier spec on a Series record (shared across artworks in that series). */
export const seriesEditionTierArrayFields: Field[] = [
  {
    name: 'tierKey',
    type: 'text',
    required: true,
    admin: {
      description:
        'Stable key artworks reference (e.g. monumental, collectors-print, a0). Unique within this series.',
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
        'True only for the tier that IS the artwork itself (DCS/Megacities "Monumental," the 3+1AP tier) — not a reproduction of it.',
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
  ...editionTierDimensionFields,
  editionTierSubstrateField,
  editionTierPrintTechniqueField,
  {
    name: 'vendureProductId',
    type: 'text',
    access: privateFieldAccess,
    admin: {
      description:
        'The ONE Vendure Product shared by every artwork using this tier. Price is set in Vendure — not duplicated here.',
    },
  },
  {
    name: 'notes',
    type: 'textarea',
  },
]

export const seriesEditionTiersField: Field = {
  name: 'editionTiers',
  type: 'array',
  labels: { singular: 'Edition tier', plural: 'Edition tiers' },
  admin: {
    description:
      'Series-wide tier definitions (size, dimensions, substrate, print technique, shared Vendure Product). Artworks link by tierKey and hold per-copy ownership in their edition tier rows.',
  },
  fields: seriesEditionTierArrayFields,
}
