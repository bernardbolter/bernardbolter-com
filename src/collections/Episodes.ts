import type { CollectionConfig } from 'payload'

import { authenticatedReadStaffWrite } from '@/access/staffAccess'

export const Episodes: CollectionConfig = {
  slug: 'episodes',
  labels: { singular: 'Episode', plural: 'Episodes' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'series', 'status', 'updatedAt'],
    description: 'MoP episode records with storyboard and clip assembly notes.',
  },
  access: authenticatedReadStaffWrite,
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'series',
      type: 'select',
      required: true,
      options: [
        { label: 'Outsider Art Review', value: 'outsider-art-review' },
        { label: 'Rap Critic', value: 'rap-critic' },
        { label: 'Studio Fails', value: 'studio-fails' },
        { label: 'Studio Series', value: 'studio-series' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'concept',
      options: [
        { label: 'Concept', value: 'concept' },
        { label: 'Storyboard', value: 'storyboard' },
        { label: 'Shot', value: 'shot' },
        { label: 'Uploaded', value: 'uploaded' },
        { label: 'Edited', value: 'edited' },
        { label: 'Posted', value: 'posted' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'concept',
      type: 'textarea',
    },
    {
      name: 'shotList',
      type: 'textarea',
    },
    {
      name: 'storyboard',
      type: 'array',
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
        },
        {
          name: 'mediaType',
          type: 'text',
        },
        {
          name: 'notes',
          type: 'textarea',
        },
      ],
    },
    {
      name: 'assembly',
      type: 'array',
      fields: [
        {
          name: 'beatName',
          type: 'text',
        },
        {
          name: 'clipFieldNoteId',
          type: 'number',
          admin: {
            description:
              'Temporary FieldNote id linkage until field-notes collection is registered.',
          },
        },
        {
          name: 'notes',
          type: 'textarea',
        },
      ],
    },
    {
      name: 'captionDrafts',
      type: 'array',
      fields: [
        {
          name: 'text',
          type: 'textarea',
          required: true,
        },
        {
          name: 'channel',
          type: 'text',
        },
      ],
    },
    {
      name: 'lines',
      type: 'relationship',
      relationTo: 'lines',
      hasMany: true,
    },
    {
      name: 'clipFieldNoteIds',
      type: 'array',
      admin: {
        description:
          'Temporary join substitute until field-notes collection is registered.',
      },
      fields: [
        {
          name: 'id',
          type: 'number',
          required: true,
        },
      ],
    },
  ],
  timestamps: true,
}
