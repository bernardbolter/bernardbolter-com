import type { CollectionConfig } from 'payload'

import { authenticatedReadStaffWrite } from '@/access/staffAccess'

export const FinaleScripts: CollectionConfig = {
  slug: 'finale-scripts',
  labels: { singular: 'Finale script', plural: 'Finale scripts' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'campaign', 'updatedAt'],
    description: 'Long-form finale arcs composed of ordered Segments.',
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
      name: 'segments',
      type: 'relationship',
      relationTo: 'segments',
      hasMany: true,
      admin: {
        description: 'Ordered segments along the finale (order field on each Segment).',
      },
    },
  ],
}
