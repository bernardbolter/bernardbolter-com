import type { CollectionConfig } from 'payload'

import { authenticatedReadStaffWrite } from '@/access/staffAccess'

export const CalendarDays: CollectionConfig = {
  slug: 'calendar-days',
  labels: { singular: 'Calendar day', plural: 'Calendar days' },
  admin: {
    useAsTitle: 'date',
    defaultColumns: ['date', 'updatedAt'],
    description: 'Day buckets holding zero or more Queue Item candidates.',
    group: 'Studio Social',
  },
  access: authenticatedReadStaffWrite,
  fields: [
    {
      name: 'date',
      type: 'date',
      required: true,
      unique: true,
      admin: { date: { pickerAppearance: 'dayOnly' } },
    },
    {
      name: 'queueItems',
      type: 'relationship',
      relationTo: 'queue-items',
      hasMany: true,
    },
  ],
}
