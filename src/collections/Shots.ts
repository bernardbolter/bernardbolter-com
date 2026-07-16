import type { CollectionConfig } from 'payload'

import { authenticatedReadStaffWrite } from '@/access/staffAccess'

export const Shots: CollectionConfig = {
  slug: 'shots',
  labels: { singular: 'Shot', plural: 'Shots' },
  admin: {
    useAsTitle: 'description',
    defaultColumns: ['description', 'status', 'campaign', 'segment', 'updatedAt'],
    description: 'Scripted reel beats for training / social video.',
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
    {
      name: 'segment',
      type: 'relationship',
      relationTo: 'segments',
      admin: {
        description: 'Optional link when this shot practices a finale segment.',
      },
    },
    { name: 'description', type: 'text', required: true },
    { name: 'intendedFraming', type: 'text' },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'needed',
      options: [
        { label: 'Needed', value: 'needed' },
        { label: 'Shot', value: 'shot' },
        { label: 'Selected', value: 'selected' },
        { label: 'Gap', value: 'gap' },
      ],
      admin: { position: 'sidebar' },
    },
  ],
}
