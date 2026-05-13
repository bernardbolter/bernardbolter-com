import { CollectionConfig } from 'payload'

export const Exhibitions: CollectionConfig = {
  slug: 'exhibitions',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'startDate', 'endDate', 'location'],
    description:
      'DEPRECATED: legacy WordPress-era exhibitions. Prefer Events + Artwork.exhibitionHistory. Removal scheduled after migration.',
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        // ── TAB 1: Core ───────────────────────────────────────
        {
          label: 'Core',
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
            },
            {
              name: 'status',
              type: 'select',
              required: true,
              defaultValue: 'draft',
              options: [
                { label: 'Draft',     value: 'draft' },
                { label: 'Published', value: 'published' },
                { label: 'Archived',  value: 'archived' },
              ],
              admin: { position: 'sidebar' },
            },
            {
              name: 'startDate',
              type: 'date',
              required: true,
              admin: { position: 'sidebar' },
            },
            {
              name: 'endDate',
              type: 'date',
              admin: { position: 'sidebar' },
            },
          ],
        },

        // ── TAB 2: Details ────────────────────────────────────
        {
          label: 'Details',
          fields: [
            {
              name: 'description',
              type: 'richText',
              localized: true,
            },
            {
              name: 'eventStatus',
              type: 'select',
              options: [
                { label: 'Scheduled', value: 'https://schema.org/EventScheduled' },
                { label: 'Postponed', value: 'https://schema.org/EventPostponed' },
                { label: 'Cancelled', value: 'https://schema.org/EventCancelled' },
                { label: 'Rescheduled', value: 'https://schema.org/EventRescheduled' },
              ],
            },
            {
              name: 'organizer',
              type: 'relationship',
              relationTo: 'people',
              filterOptions: { role: { contains: 'organizer' } },
              admin: {
                description: 'Person or organization organizing the exhibition.',
              },
            },
            {
              name: 'location',
              type: 'group',
              fields: [
                { name: 'name',        type: 'text', admin: { description: 'Venue name' } },
                { name: 'address',     type: 'text', admin: { description: 'Full address' } },
                { name: 'city',        type: 'text' },
                { name: 'region',      type: 'text' },
                { name: 'country',     type: 'text' },
                { name: 'countryCode', type: 'text' },
                { name: 'postalCode',  type: 'text' },
                { name: 'lat',         type: 'number' },
                { name: 'lng',         type: 'number' },
                {
                  name: 'mapPicker',
                  type: 'ui',
                  admin: {
                    components: {
                      Field: '/components/admin/MapField#MapField',
                    },
                  },
                },
              ],
            },
            {
              name: 'url',
              type: 'text',
              admin: {
                description: 'Official exhibition website.',
              },
            },
          ],
        },

        // ── TAB 3: Artworks ───────────────────────────────────
        {
          label: 'Artworks',
          fields: [
            {
              name: 'artworks',
              type: 'relationship',
              relationTo: 'artworks',
              hasMany: true,
              admin: {
                description: 'Artworks featured in this exhibition.',
              },
            },
          ],
        },

        // ── TAB 4: Media ──────────────────────────────────────
        {
          label: 'Media',
          fields: [
            {
              name: 'primaryImage',
              type: 'upload',
              relationTo: 'media',
              admin: {
                description: 'Main exhibition image.',
              },
            },
            {
              name: 'additionalImages',
              type: 'array',
              fields: [
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  required: true,
                },
                { name: 'caption', type: 'text', localized: true },
              ],
            },
          ],
        },

        // ── TAB 5: SEO ────────────────────────────────────────
        {
          label: 'SEO',
          fields: [
            { name: 'metaTitle',       type: 'text',     localized: true },
            { name: 'metaDescription', type: 'textarea', localized: true },
            {
              name: 'sameAs',
              type: 'array',
              fields: [
                { name: 'url',   type: 'text', required: true },
                { name: 'label', type: 'text' },
              ],
            },
          ],
        },
      ],
    },
  ],
}