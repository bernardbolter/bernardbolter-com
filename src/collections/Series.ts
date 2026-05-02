import { CollectionConfig } from 'payload'

export const Series: CollectionConfig = {
  slug: 'series',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'status', 'yearStart', 'yearEnd'],
    description: 'Practice series definitions used by artworks and public series pages.',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'description',
      type: 'richText',
      localized: true,
    },
    {
      name: 'yearStart',
      type: 'number',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'yearEnd',
      type: 'number',
      admin: {
        position: 'sidebar',
        description: 'Leave empty when the series is ongoing.',
      },
    },
    {
      name: 'city',
      type: 'text',
    },
    {
      name: 'country',
      type: 'text',
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'jsonldOutput',
      type: 'json',
      admin: {
        readOnly: true,
        description: 'Computed JSON-LD snapshot for series pages.',
      },
    },
  ],
}