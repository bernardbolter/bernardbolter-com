import type { CollectionConfig } from 'payload'

import { authenticatedReadStaffWrite } from '@/access/staffAccess'

export const Themes: CollectionConfig = {
  slug: 'themes',
  labels: { singular: 'Theme', plural: 'Themes' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'campaign', 'date', 'updatedAt'],
    description: 'Weekly-review reasoning themes that can spawn multiple Queue Items.',
    group: 'Studio Social',
  },
  access: authenticatedReadStaffWrite,
  fields: [
    {
      name: 'campaign',
      type: 'relationship',
      relationTo: 'campaigns',
      required: true,
    },
    { name: 'title', type: 'text', required: true },
    {
      name: 'sourceFieldNotes',
      type: 'relationship',
      relationTo: 'field-notes',
      hasMany: true,
    },
    {
      name: 'sourceArtworks',
      type: 'relationship',
      relationTo: 'artworks',
      hasMany: true,
    },
    {
      name: 'notes',
      type: 'textarea',
      admin: { description: 'Reasoning captured during the weekly session.' },
    },
    { name: 'date', type: 'date' },
    {
      name: 'informedByMetrics',
      type: 'relationship',
      relationTo: 'queue-items',
      hasMany: true,
      admin: {
        description: 'Prior Queue Items whose metrics informed this theme.',
      },
    },
  ],
}
