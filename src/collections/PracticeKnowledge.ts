import type { CollectionBeforeValidateHook, CollectionConfig } from 'payload'

import { isArtistOrAdmin } from '@/access/isArtistOrAdmin'
import { publicReadStaffCollectionAccess } from '@/access/staffAccess'

const ALLOWED_SLUGS = [
  'biography',
  'artist-statement',
  'series',
  'visual-vocabulary',
  'art-historical-touchstones',
  'preferred-vocabulary',
] as const

const validateSlug: CollectionBeforeValidateHook = ({ data }) => {
  const slug = data?.slug
  if (slug && !ALLOWED_SLUGS.includes(slug as (typeof ALLOWED_SLUGS)[number])) {
    throw new Error(`slug must be one of: ${ALLOWED_SLUGS.join(', ')}`)
  }
}

export const PracticeKnowledge: CollectionConfig = {
  slug: 'practice-knowledge',
  labels: { singular: 'Practice knowledge', plural: 'Practice knowledge' },
  admin: {
    useAsTitle: 'sectionLabel',
    defaultColumns: ['slug', 'sectionLabel', 'status', 'order', 'updatedAt'],
    description: 'Documents that brief the Art/Official agent at session start.',
  },
  access: {
    read: ({ req: { user } }) => {
      if (isArtistOrAdmin(user)) return true
      return { status: { equals: 'active' } }
    },
    create: publicReadStaffCollectionAccess.create,
    update: publicReadStaffCollectionAccess.update,
    delete: publicReadStaffCollectionAccess.delete,
  },
  fields: [
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: `One of: ${ALLOWED_SLUGS.join(', ')}`,
      },
    },
    {
      name: 'sectionLabel',
      type: 'text',
      required: true,
      admin: { description: 'Heading used when assembling the system prompt.' },
    },
    {
      name: 'content',
      type: 'richText',
      localized: true,
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Draft', value: 'draft' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'order',
      type: 'number',
      required: true,
      defaultValue: 100,
      admin: { position: 'sidebar', description: 'Lower numbers appear first in the prompt.' },
    },
  ],
  hooks: {
    beforeValidate: [validateSlug],
  },
}
