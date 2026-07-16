import type { CollectionConfig } from 'payload'

import { authenticatedReadStaffWrite } from '@/access/staffAccess'

export const Takes: CollectionConfig = {
  slug: 'takes',
  labels: { singular: 'Take', plural: 'Takes' },
  admin: {
    useAsTitle: 'quickNote',
    defaultColumns: ['shot', 'takeNumber', 'selected', 'updatedAt'],
    description: 'Individual takes linked to video FieldNotes for a Shot.',
    group: 'Studio Social',
  },
  access: authenticatedReadStaffWrite,
  fields: [
    {
      name: 'shot',
      type: 'relationship',
      relationTo: 'shots',
      required: true,
    },
    { name: 'takeNumber', type: 'number', required: true },
    {
      name: 'videoFieldNote',
      type: 'relationship',
      relationTo: 'field-notes',
      admin: { description: 'The actual footage FieldNote.' },
    },
    { name: 'quickNote', type: 'text' },
    {
      name: 'selected',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Marked during assembly review for EDL export.' },
    },
    {
      name: 'inPointSec',
      type: 'number',
      admin: { description: 'Optional in-point seconds for EDL export.' },
    },
    {
      name: 'outPointSec',
      type: 'number',
      admin: { description: 'Optional out-point seconds for EDL export.' },
    },
  ],
}
