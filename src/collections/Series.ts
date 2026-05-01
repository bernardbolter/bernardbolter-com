import { CollectionConfig } from 'payload'

export const Series: CollectionConfig = {
  slug: 'series',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'status', 'startYear'],
    description: 'Artwork series. Each sub-site (acolorfulhistory.com etc.) maps to one series.',
  },
  fields: [
    {
      type: 'tabs',
      tabs: [

        // ── TAB 1: Identity ───────────────────────────────────
        {
          label: 'Identity',
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
              admin: {
                description: 'e.g. a-colorful-history, digital-city-series, megacities',
              },
            },
            {
              name: 'status',
              type: 'select',
              required: true,
              defaultValue: 'active',
              options: [
                { label: 'Active',    value: 'active' },
                { label: 'Completed', value: 'completed' },
                { label: 'Ongoing',   value: 'ongoing' },
                { label: 'Archived',  value: 'archived' },
              ],
              admin: { position: 'sidebar' },
            },
            {
              name: 'startYear',
              type: 'number',
              admin: { position: 'sidebar' },
            },
            {
              name: 'endYear',
              type: 'number',
              admin: {
                position: 'sidebar',
                description: 'Leave empty if ongoing.',
              },
            },
            {
              name: 'description',     // schema.org: description
              type: 'richText',
              localized: true,
            },
            {
              name: 'shortDescription', // for cards, meta
              type: 'textarea',
              localized: true,
              admin: {
                description: 'Max 160 chars. Used for series cards and meta descriptions.',
              },
            },
            {
              name: 'coverImage',
              type: 'upload',
              relationTo: 'media',
            },
          ],
        },

        // ── TAB 2: Sub-site ───────────────────────────────────
        {
          label: 'Sub-site',
          admin: {
            description: 'If this series has its own dedicated website.',
          },
          fields: [
            {
              name: 'hasSite',
              type: 'checkbox',
              defaultValue: false,
              label: 'Has dedicated sub-site',
            },
            {
              name: 'siteUrl',
              type: 'text',
              admin: {
                condition: (data) => data?.hasSite,
                description: 'e.g. https://acolorfulhistory.com',
              },
            },
            {
              name: 'siteName',
              type: 'text',
              localized: true,
              admin: {
                condition: (data) => data?.hasSite,
                description: 'Display name for the sub-site.',
              },
            },
          ],
        },

        // ── TAB 3: SEO ────────────────────────────────────────
        {
          label: 'SEO',
          fields: [
            {
              name: 'metaTitle',
              type: 'text',
              localized: true,
            },
            {
              name: 'metaDescription',
              type: 'textarea',
              localized: true,
            },
            {
              name: 'sameAs',          // schema.org: sameAs
              type: 'array',
              admin: {
                description: 'External references to this series e.g. Artsy, Wikipedia.',
              },
              fields: [
                { name: 'url', type: 'text', required: true },
                { name: 'label', type: 'text' },
              ],
            },
          ],
        },

      ],
    },
  ],
}