import type { CollectionBeforeValidateHook, CollectionConfig } from 'payload'

import { isArtistOrAdmin } from '@/access/isArtistOrAdmin'
import { publicReadStaffCollectionAccess } from '@/access/staffAccess'

const ALLOWED_SLUGS = [
  'gallery-biography',
  'programme-focus',
  'represented-artists',
  'exhibition-history',
  'curatorial-position',
] as const

const validateSlug: CollectionBeforeValidateHook = ({ data }) => {
  const slug = data?.slug
  if (slug && !ALLOWED_SLUGS.includes(slug as (typeof ALLOWED_SLUGS)[number])) {
    throw new Error(`slug must be one of: ${ALLOWED_SLUGS.join(', ')}`)
  }
}

export const GalleryKnowledge: CollectionConfig = {
  slug: 'gallery-knowledge',
  labels: { singular: 'Gallery knowledge', plural: 'Gallery knowledge' },
  admin: {
    useAsTitle: 'sectionLabel',
    defaultColumns: ['slug', 'sectionLabel', 'status', 'order', 'updatedAt'],
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
      admin: { description: `One of: ${ALLOWED_SLUGS.join(', ')}` },
    },
    { name: 'sectionLabel', type: 'text', required: true },
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
      admin: { position: 'sidebar' },
    },
  ],
  hooks: {
    beforeValidate: [validateSlug],
  },
}
