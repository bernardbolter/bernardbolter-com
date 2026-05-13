import type { CollectionConfig } from 'payload'

export const Tags: CollectionConfig = {
  slug: 'tags',
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'type', 'updatedAt'],
    description: 'Controlled vocabulary tags for artworks and events.',
  },
  fields: [
    {
      name: 'label',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Movement', value: 'movement' },
        { label: 'Style', value: 'style' },
        { label: 'Subject', value: 'subject' },
        { label: 'Genre', value: 'genre' },
        { label: 'Period', value: 'period' },
      ],
      index: true,
    },
    {
      name: 'aatUri',
      type: 'text',
      admin: {
        description: 'Optional Getty AAT URI.',
      },
    },
    {
      name: 'iconclassNotation',
      type: 'text',
      admin: {
        description: 'Optional Iconclass notation.',
      },
    },
    {
      name: 'lcshUri',
      type: 'text',
      admin: {
        description: 'Optional Library of Congress Subject Heading URI.',
      },
    },
    {
      name: 'description',
      type: 'text',
    },
  ],
}
