import type { CollectionConfig } from 'payload'

import { authenticatedReadStaffWrite } from '@/access/staffAccess'

export const StudioConversations: CollectionConfig = {
  slug: 'studio-conversations',
  labels: { singular: 'Studio conversation', plural: 'Studio conversations' },
  admin: {
    useAsTitle: 'summary',
    defaultColumns: ['recordOrigin', 'updatedAt', 'createdAt'],
    description: 'Long-form thinking captured through small-model conversation.',
  },
  access: authenticatedReadStaffWrite,
  fields: [
    {
      name: 'messages',
      type: 'array',
      required: true,
      fields: [
        {
          name: 'role',
          type: 'select',
          required: true,
          options: [
            { label: 'User', value: 'user' },
            { label: 'Assistant', value: 'assistant' },
          ],
        },
        {
          name: 'content',
          type: 'textarea',
          required: true,
        },
        {
          name: 'timestamp',
          type: 'date',
          required: true,
        },
      ],
    },
    {
      name: 'summary',
      type: 'textarea',
    },
    {
      name: 'summaryEmbedding',
      type: 'json',
      admin: {
        description: 'JSON number array until pgvector columns are introduced.',
      },
    },
    {
      name: 'lines',
      type: 'relationship',
      relationTo: 'lines',
      hasMany: true,
    },
    {
      name: 'relatedArtwork',
      type: 'relationship',
      relationTo: 'artworks',
    },
    {
      name: 'relatedEpisode',
      type: 'number',
      admin: {
        description:
          'Temporary episode id reference. Migrates to relationship once Episodes collection is registered.',
      },
    },
    {
      name: 'recordOrigin',
      type: 'select',
      required: true,
      defaultValue: 'user',
      options: [{ label: 'User', value: 'user' }],
      admin: { position: 'sidebar' },
    },
  ],
  timestamps: true,
}
