import type { CollectionConfig, Where } from 'payload'

import { isArtistOrAdmin, privateFieldAccess } from '@/access/isArtistOrAdmin'
import { triptychBeforeChange } from '@/hooks/triptychBeforeChange'

export const Triptychs: CollectionConfig = {
  slug: 'triptychs',
  hooks: {
    beforeChange: [triptychBeforeChange],
  },
  access: {
    read: ({ req: { user } }) => {
      if (isArtistOrAdmin(user)) return true
      const where: Where = { status: { equals: 'published' } }
      return where
    },
    create: ({ req: { user } }) => isArtistOrAdmin(user),
    update: ({ req: { user } }) => isArtistOrAdmin(user),
    delete: ({ req: { user } }) => isArtistOrAdmin(user),
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'series', 'status', 'yearStart', 'updatedAt'],
    description:
      'MoP triptych sets — three panels sold and catalogued as a unit. Commerce fields live here, not on individual artworks.',
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Core',
          fields: [
            {
              name: 'title',
              type: 'text',
              required: true,
              localized: true,
            },
            {
              name: 'slug',
              type: 'text',
              required: true,
              unique: true,
              index: true,
            },
            {
              name: 'series',
              type: 'relationship',
              relationTo: 'series',
              required: true,
              admin: { description: 'Usually Mediums of Perception or Mediums of War.' },
            },
            {
              name: 'status',
              type: 'select',
              required: true,
              defaultValue: 'draft',
              options: [
                { label: 'Draft', value: 'draft' },
                { label: 'Published', value: 'published' },
                { label: 'Archived', value: 'archived' },
              ],
              admin: { position: 'sidebar' },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'yearStart',
                  type: 'number',
                  admin: {
                    width: '50%',
                    description: 'Four-digit year the triptych was begun.',
                  },
                },
                {
                  name: 'yearCompleted',
                  type: 'number',
                  admin: {
                    width: '50%',
                    description: 'Year finished if different from year start.',
                  },
                },
              ],
            },
            {
              name: 'city',
              type: 'text',
              localized: true,
              admin: { description: 'Primary city context for this triptych.' },
            },
            {
              name: 'country',
              type: 'text',
              localized: true,
            },
            {
              name: 'panels',
              type: 'array',
              labels: { singular: 'Panel', plural: 'Panels (3)' },
              minRows: 3,
              maxRows: 3,
              required: true,
              fields: [
                {
                  name: 'artwork',
                  type: 'relationship',
                  relationTo: 'artworks',
                  required: true,
                },
                {
                  name: 'position',
                  type: 'select',
                  required: true,
                  options: [
                    { label: 'I — earliest technology', value: 'I' },
                    { label: 'II — historical print', value: 'II' },
                    { label: 'III — contemporary', value: 'III' },
                  ],
                },
              ],
              admin: {
                description:
                  'Exactly three panels. Panel I = earliest technology, II = historical print, III = contemporary.',
              },
            },
            {
              name: 'description',
              type: 'richText',
              localized: true,
              admin: { description: 'Overview of this triptych as a single work.' },
            },
          ],
        },
        {
          label: 'Intent & corpus',
          admin: {
            description:
              'Art/Official may stage these fields in a future triptych session. Never auto-publish.',
          },
          fields: [
            {
              name: 'descriptionShort',
              type: 'text',
              localized: true,
              maxLength: 400,
              admin: { description: '1–3 sentences for cards and meta.' },
            },
            {
              name: 'descriptionLong',
              type: 'richText',
              localized: true,
            },
            {
              name: 'intent',
              type: 'textarea',
              localized: true,
              admin: {
                description: 'What this triptych means as a whole — first person. Never AI-generated.',
              },
            },
            {
              name: 'conceptualKeywords',
              type: 'array',
              labels: { singular: 'Keyword', plural: 'Conceptual keywords' },
              fields: [{ name: 'keyword', type: 'text', required: true }],
            },
            {
              name: 'artHistoricalReferences',
              type: 'relationship',
              relationTo: 'art-historical-references',
              hasMany: true,
            },
            {
              name: 'artHistoricalContext',
              type: 'textarea',
              localized: true,
            },
            {
              name: 'seriesContext',
              type: 'textarea',
              localized: true,
              admin: { description: 'Where this triptych sits in the MoP arc.' },
            },
            {
              name: 'formalContributionAssessment',
              type: 'textarea',
              localized: true,
              admin: {
                description:
                  'What this triptych does that has not been done before — confirmed by Bernard.',
              },
            },
          ],
        },
        {
          label: 'Commerce',
          admin: {
            description:
              'Prices live in Vendure only. Originals and prints are sold as a set of three — never per panel.',
          },
          fields: [
            {
              name: 'vendureProductId',
              type: 'text',
              admin: {
                description: 'Vendure product ID for the original triptych set.',
              },
            },
            {
              name: 'printSets',
              type: 'array',
              labels: { singular: 'Print edition', plural: 'Print editions' },
              fields: [
                {
                  name: 'size',
                  type: 'select',
                  required: true,
                  options: [
                    { label: 'Large (A3)', value: 'large' },
                    { label: 'Small (A5)', value: 'small' },
                  ],
                },
                {
                  name: 'edition',
                  type: 'number',
                  required: true,
                  admin: {
                    description: 'Total edition size (e.g. 15 large, 30 small). Never changes.',
                  },
                },
                {
                  name: 'vendureProductId',
                  type: 'text',
                  required: true,
                  admin: { description: 'Vendure product ID for this print size.' },
                },
                {
                  name: 'printAvailableCount',
                  type: 'number',
                  admin: {
                    readOnly: true,
                    description:
                      'Remaining prints — synced from Vendure via webhook only. Initialised from edition on first save.',
                  },
                },
              ],
            },
            {
              name: 'printEditionReleaseDate',
              type: 'date',
              admin: { description: 'Date the print edition went on sale.' },
            },
            {
              name: 'signedAndNumbered',
              type: 'checkbox',
              defaultValue: true,
              admin: { description: 'Hand-signed and numbered by Bernard.' },
            },
            {
              name: 'originalsSoldDate',
              type: 'date',
              access: privateFieldAccess,
              admin: {
                description: 'Provenance — staff only, never in public API.',
              },
            },
            {
              name: 'originalsBuyer',
              type: 'text',
              access: privateFieldAccess,
              admin: {
                description: 'Buyer name or institution — staff only.',
              },
            },
          ],
        },
      ],
    },
  ],
}
