import type { CollectionConfig } from 'payload'

import { authenticatedReadStaffWrite } from '@/access/staffAccess'

export const Segments: CollectionConfig = {
  slug: 'segments',
  labels: { singular: 'Segment', plural: 'Segments' },
  admin: {
    useAsTitle: 'wallSection',
    defaultColumns: ['order', 'wallSection', 'coverageStatus', 'finaleScript', 'updatedAt'],
    description: 'Ordered stretches of a Finale Script (e.g. East Side Gallery wall sections).',
    group: 'Studio Social',
  },
  access: authenticatedReadStaffWrite,
  fields: [
    {
      name: 'finaleScript',
      type: 'relationship',
      relationTo: 'finale-scripts',
      required: true,
    },
    {
      name: 'order',
      type: 'number',
      required: true,
      admin: { description: 'Position along the wall / arc.' },
    },
    { name: 'wallSection', type: 'text', required: true },
    { name: 'paintedContent', type: 'textarea' },
    { name: 'angle', type: 'textarea' },
    { name: 'connectionNotes', type: 'textarea' },
    {
      name: 'coverageStatus',
      type: 'select',
      defaultValue: 'no-footage',
      options: [
        { label: 'No footage', value: 'no-footage' },
        { label: 'Some takes', value: 'some-takes' },
        { label: 'Covered', value: 'covered' },
      ],
      admin: {
        description: 'Manual or digest-derived coverage from linked Shots/Takes.',
        position: 'sidebar',
      },
    },
  ],
}
