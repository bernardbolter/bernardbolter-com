import type { CollectionConfig } from 'payload'

import { authenticatedReadStaffWrite } from '@/access/staffAccess'

export const Lines: CollectionConfig = {
  slug: 'lines',
  labels: { singular: 'Line', plural: 'Lines' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'status', 'recordOrigin', 'updatedAt'],
    description:
      'Active investigations that connect FieldNotes, Episodes, Artworks, and conversations.',
  },
  access: authenticatedReadStaffWrite,
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Dormant', value: 'dormant' },
        { label: 'Closed', value: 'closed' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'recordOrigin',
      type: 'select',
      required: true,
      defaultValue: 'user',
      options: [
        { label: 'User', value: 'user' },
        { label: 'Small model', value: 'small-model' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Who introduced this line (manual or model suggestion).',
      },
    },
  ],
  timestamps: true,
}
