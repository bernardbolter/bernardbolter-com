import type { GlobalConfig } from 'payload'

import { isArtistOrAdmin, privateFieldAccess } from '@/access/isArtistOrAdmin'
import {
  NEIGHBORHOOD_COMMISSION_CITY_DEFAULT,
  NEIGHBORHOOD_COMMISSION_CITY_OPTIONS,
} from '@/fields/neighborhoodCommissionShared'

/**
 * Offering config for ACH Neighborhood Commissions page copy and founding batch.
 * Inventory lives in ach-neighborhood-sources; Tier 2 flags on Artworks.ach.
 */
export const NeighborhoodCommissions: GlobalConfig = {
  slug: 'neighborhood-commissions',
  label: 'Neighborhood Commissions',
  admin: {
    description:
      'Page pitch, founding-batch pricing, and proof links for acolorfulhistory.com/neighborhood.',
  },
  access: {
    read: () => true,
    update: ({ req: { user } }) => isArtistOrAdmin(user),
  },
  fields: [
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description: 'When off, ACH should hide or soft-close the offering.',
      },
    },
    {
      name: 'city',
      type: 'select',
      required: true,
      defaultValue: NEIGHBORHOOD_COMMISSION_CITY_DEFAULT,
      options: [...NEIGHBORHOOD_COMMISSION_CITY_OPTIONS],
      admin: {
        description: 'Primary city for this offering. Filter key for future multi-city pages.',
      },
    },
    {
      type: 'collapsible',
      label: 'Founding batch',
      admin: { initCollapsed: false },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'foundingBatchSize',
              type: 'number',
              required: true,
              defaultValue: 5,
              min: 1,
              admin: {
                width: '25%',
                description: 'Total founding commissions.',
              },
            },
            {
              name: 'foundingBatchPriceUsd',
              type: 'number',
              required: true,
              defaultValue: 1800,
              min: 0,
              admin: {
                width: '25%',
                description: 'Direct / newsletter founding price (USD).',
              },
            },
            {
              name: 'foundingBatchSizeLabel',
              type: 'text',
              required: true,
              defaultValue: '36"×36"',
              admin: {
                width: '25%',
                description: 'Display size label.',
              },
            },
            {
              name: 'foundingSlotsRemaining',
              type: 'number',
              required: true,
              defaultValue: 5,
              min: 0,
              admin: {
                width: '25%',
                description: 'Artist-maintained remaining founding slots.',
              },
            },
          ],
        },
        {
          name: 'foundingBatchFraming',
          type: 'textarea',
          localized: true,
          admin: {
            description:
              'Public framing — e.g. “Founding collectors — first five commissions of the series, priced to start it.”',
          },
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Page copy',
      admin: { initCollapsed: false },
      fields: [
        {
          name: 'pageTitle',
          type: 'text',
          localized: true,
          defaultValue: 'Neighborhood Commissions',
          admin: { description: 'Nav label / page title.' },
        },
        {
          name: 'eyebrow',
          type: 'text',
          localized: true,
          defaultValue: 'A Colorful History',
          admin: { description: 'Series framing above the title.' },
        },
        {
          name: 'pitch',
          type: 'textarea',
          localized: true,
          admin: {
            description:
              'Core pitch — native SF, Berlin-based, shed studio, hand delivery, Artism archive.',
          },
        },
        {
          name: 'berlinFrame',
          type: 'textarea',
          localized: true,
          admin: {
            description:
              'Honest differentiator — Berlin experimental work; SF is home / staying connected.',
          },
        },
        {
          name: 'archiveCredibility',
          type: 'textarea',
          localized: true,
          admin: {
            description:
              'Trust copy — long practice finally showing its work via the structured archive.',
          },
        },
        {
          name: 'tier1Intro',
          type: 'textarea',
          localized: true,
          admin: { description: 'Intro for browse unpainted historical photos.' },
        },
        {
          name: 'tier2Intro',
          type: 'textarea',
          localized: true,
          admin: {
            description:
              'Intro for revisited subjects — photo has history, each new painting is unique.',
          },
        },
        {
          name: 'tier3Intro',
          type: 'textarea',
          localized: true,
          admin: { description: 'Intro for fully custom research tier.' },
        },
        {
          name: 'designerCommissionNote',
          type: 'textarea',
          localized: true,
          admin: {
            description:
              'Piece A without install photo — e.g. commissioned via an SF interior designer.',
          },
        },
      ],
    },
    {
      name: 'artspanEvent',
      type: 'relationship',
      relationTo: 'events',
      admin: {
        description:
          'ArtSpan Selections 2017 / Heron Arts — Piece B proof deep link (do not re-narrate on ACH).',
      },
    },
    {
      name: 'privatePricingNotes',
      type: 'group',
      label: 'Private pricing notes',
      access: privateFieldAccess,
      admin: {
        description:
          'Staff only — designer/agent rates and post-founding expectations. Not shown on ACH.',
      },
      fields: [
        {
          name: 'designerAgentPriceRange',
          type: 'text',
          access: privateFieldAccess,
          admin: {
            description: 'e.g. $2,500–$3,000+ for designer/agent-referred commissions.',
          },
        },
        {
          name: 'postFoundingDirectRange',
          type: 'text',
          access: privateFieldAccess,
          admin: {
            description: 'e.g. expected $2,500–$4,000+ direct after founding batch.',
          },
        },
        {
          name: 'internalNote',
          type: 'textarea',
          access: privateFieldAccess,
          admin: {
            description: 'Internal reasoning — do not publish apologetic or hedging language.',
          },
        },
      ],
    },
  ],
}
