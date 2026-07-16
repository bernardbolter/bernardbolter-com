import type { CollectionConfig } from 'payload'

import { authenticatedReadStaffWrite } from '@/access/staffAccess'

export const Campaigns: CollectionConfig = {
  slug: 'campaigns',
  labels: { singular: 'Campaign', plural: 'Campaigns' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'status', 'startDate', 'finaleDate', 'updatedAt'],
    description: 'Reusable social-campaign containers (planning through complete).',
    group: 'Studio Social',
  },
  access: authenticatedReadStaffWrite,
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'startDate', type: 'date' },
    { name: 'finaleDate', type: 'date' },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'planning',
      options: [
        { label: 'Planning', value: 'planning' },
        { label: 'Active', value: 'active' },
        { label: 'Final push', value: 'final-push' },
        { label: 'Complete', value: 'complete' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'cadenceRules',
      type: 'textarea',
      admin: {
        description:
          'Plain-language cadence notes for weekly sessions — not auto-enforced.',
      },
    },
    {
      name: 'bufferPhaseEnabled',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Phase 2 flag only. When true, scheduled items are intended for Buffer — no push logic in Phase 1.',
        position: 'sidebar',
      },
    },
    {
      name: 'finaleScript',
      type: 'relationship',
      relationTo: 'finale-scripts',
      admin: { position: 'sidebar' },
    },
  ],
}
