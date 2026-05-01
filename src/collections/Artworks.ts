import { CollectionConfig } from 'payload'

export const Artworks: CollectionConfig = {
  slug: 'artworks',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'series', 'dateCreated', 'isForSale'],
    description: 'The complete archive of all artworks.',
  },
  fields: [
    // ── Always visible: featured image ────────────────────────
    {
      name: 'primaryImage',
      type: 'upload',
      relationTo: 'media',
      // required: true,
    },
    {
      name: 'wpImageUrl',
      type: 'text',
      admin: {
        description: 'Temporary WordPress image URL until migrated to R2.',
        position: 'sidebar',
      },
    },

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
              name: 'creator',
              type: 'relationship',
              relationTo: 'people',
              required: true,
              filterOptions: { role: { contains: 'artist' } },
              admin: { position: 'sidebar' },
            },
            {
              name: 'series',
              type: 'relationship',
              relationTo: 'series',
              hasMany: false,
              admin: { position: 'sidebar' },
            },
            {
              // auto-populated from series, drives tab visibility
              name: 'seriesSlug',
              type: 'text',
              admin: {
                readOnly: true,
                position: 'sidebar',
                description: 'Auto-set from series.',
              },
              hooks: {
                beforeChange: [
                  async ({ siblingData, req }) => {
                    if (!siblingData?.series) return null
                    const s = await req.payload.findByID({
                      collection: 'series',
                      id: siblingData.series,
                    })
                    return s?.slug ?? null
                  },
                ],
              },
            },
            {
              name: 'status',
              type: 'select',
              required: true,
              defaultValue: 'draft',
              options: [
                { label: 'Draft', value: 'draft' },
                { label: 'Published', value: 'published' },
                { label: 'Archived', value: 'archived' },
              ],
              admin: { position: 'sidebar' },
            },
            {
              name: 'dateCreated',
              type: 'date',
              required: true,
              admin: { position: 'sidebar' },
            },
            {
              name: 'datePublished',
              type: 'date',
              admin: { position: 'sidebar' },
            },
            {
              name: 'wp_id',
              type: 'number',
              admin: {
                position: 'sidebar',
                description: 'Legacy WordPress ID.',
              },
            },
            {
              name: 'oldWpUrl',
              type: 'text',
              admin: {
                description: 'Legacy WordPress artwork URL.',
              },
            },
          ],
        },

        // ── TAB 2: Artwork ────────────────────────────────────
        {
          label: 'Artwork',
          fields: [
            {
              name: 'artform',
              type: 'select',
              required: true,
              options: [
                { label: 'Painting', value: 'Painting' },
                { label: 'Print', value: 'Print' },
                { label: 'Photography', value: 'Photography' },
                { label: 'Drawing', value: 'Drawing' },
                { label: 'Sculpture', value: 'Sculpture' },
                { label: 'Digital', value: 'Digital' },
                { label: 'Installation', value: 'Installation' },
                { label: 'Mixed Media', value: 'MixedMedia' },
              ],
            },
            {
              name: 'artMedium',
              type: 'text',
              localized: true,
              admin: {
                description: 'e.g. acrylic transfer and acrylic on canvas',
              },
            },
            {
              name: 'artworkSurface',
              type: 'text',
              localized: true,
            },
            {
              name: 'dimensions',
              type: 'group',
              fields: [
                { name: 'width', type: 'number' },
                { name: 'height', type: 'number' },
                {
                  name: 'depth',
                  type: 'number',
                  admin: { description: 'Only for 3D works.' },
                },
                {
                  name: 'unitCode',
                  type: 'select',
                  defaultValue: 'CMT',
                  options: [
                    { label: 'cm', value: 'CMT' },
                    { label: 'mm', value: 'MMT' },
                    { label: 'm', value: 'MTR' },
                    { label: 'inch', value: 'INH' },
                  ],
                },
              ],
            },
            {
              name: 'orientation',
              type: 'select',
              options: [
                { label: 'Portrait', value: 'portrait' },
                { label: 'Landscape', value: 'landscape' },
                { label: 'Square', value: 'square' },
              ],
            },
          ],
        },

        // ── TAB 3: Description ────────────────────────────────
        {
          label: 'Description',
          fields: [
            {
              name: 'description',
              type: 'richText',
              localized: true,
            },
            {
              name: 'aiDescription',
              type: 'textarea',
              localized: true,
              admin: {
                description: 'AI-generated visual description for search and accessibility.',
              },
            },
            {
              name: 'aiVibe',
              type: 'textarea',
              admin: {
                description: 'Semantic/mood description for embeddings.',
              },
            },
            {
              name: 'embedding',
              type: 'json',
              admin: {
                readOnly: true,
                description: 'Vector embedding — auto-generated, do not edit.',
              },
            },
            {
              name: 'keywords',
              type: 'array',
              fields: [{ name: 'keyword', type: 'text' }],
            },
            {
              name: 'genre',
              type: 'text',
              localized: true,
            },
          ],
        },

        // ── TAB 4: Media ──────────────────────────────────────
        {
          label: 'Media',
          fields: [
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
                {
                  name: 'imageRole',
                  type: 'select',
                  options: [
                    { label: 'Detail', value: 'detail' },
                    { label: 'Installation View', value: 'installation' },
                    { label: 'Process', value: 'process' },
                    { label: 'Reverse', value: 'reverse' },
                    { label: 'Other', value: 'other' },
                  ],
                },
              ],
            },
            {
              name: 'videos',
              type: 'array',
              fields: [
                {
                  name: 'videoType',
                  type: 'select',
                  required: true,
                  options: [
                    { label: 'Upload (R2)', value: 'upload' },
                    { label: 'YouTube', value: 'youtube' },
                    { label: 'Vimeo', value: 'vimeo' },
                    { label: 'Other URL', value: 'url' },
                  ],
                },
                {
                  name: 'videoFile',
                  type: 'upload',
                  relationTo: 'media',
                  admin: {
                    condition: (_, s) => s?.videoType === 'upload',
                  },
                },
                {
                  name: 'videoUrl',
                  type: 'text',
                  admin: {
                    condition: (_, s) => s?.videoType !== 'upload',
                  },
                },
                {
                  name: 'posterImage',
                  type: 'upload',
                  relationTo: 'media',
                },
                { name: 'title', type: 'text', localized: true },
                { name: 'description', type: 'textarea', localized: true },
                {
                  name: 'videoRole',
                  type: 'select',
                  options: [
                    { label: 'Making Of', value: 'makingOf' },
                    { label: 'Documentation', value: 'documentation' },
                    { label: 'AR Experience', value: 'ar' },
                    { label: 'Interview', value: 'interview' },
                    { label: 'Other', value: 'other' },
                  ],
                },
              ],
            },
          ],
        },

        // ── TAB 5: Location ───────────────────────────────────
        {
          label: 'Location',
          fields: [
            {
              name: 'locationCreated',
              type: 'group',
              fields: [
                {
                  name: 'label',
                  type: 'text',
                  admin: { description: 'e.g. studio in CANK, Neukölln' },
                },
                { name: 'city', type: 'text' },
                { name: 'country', type: 'text' },
                { name: 'countryCode', type: 'text' },
                { name: 'lat', type: 'number' },
                { name: 'lng', type: 'number' },
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
          ],
        },

        // ── TAB 6: Provenance ─────────────────────────────────
        {
          label: 'Provenance',
          fields: [
            {
              name: 'artworkHolder',
              type: 'group',
              fields: [
                {
                  name: 'holderType',
                  type: 'select',
                  defaultValue: 'Person',
                  options: [
                    { label: 'Person', value: 'Person' },
                    { label: 'Organization', value: 'Organization' },
                  ],
                },
                {
                  name: 'holderPerson',
                  type: 'relationship',
                  relationTo: 'people',
                  admin: {
                    condition: (data) => data?.artworkHolder?.holderType === 'Person',
                  },
                },
                {
                  name: 'holderName',
                  type: 'text',
                  admin: { description: 'If not in People collection.' },
                },
                { name: 'holderUrl', type: 'text' },
              ],
            },
            {
              name: 'provenanceNotes',
              type: 'richText',
            },
          ],
        },

        // ── TAB 7: Exhibitions ────────────────────────────────
        {
          label: 'Exhibitions',
          fields: [
            {
              name: 'exhibitions',
              type: 'relationship',
              relationTo: 'exhibitions',
              hasMany: true,
              admin: {
                description: 'Select exhibitions this work appeared in.',
              },
            },
          ],
        },

        // ── TAB 8: Commerce ───────────────────────────────────
        {
          label: 'Commerce',
          fields: [
            {
              name: 'isForSale',
              type: 'checkbox',
              defaultValue: false,
              admin: { position: 'sidebar' },
            },
            {
              name: 'offers',
              type: 'group',
              admin: {
                condition: (data) => Boolean(data?.isForSale),
              },
              fields: [
                { name: 'price', type: 'number' },
                {
                  name: 'priceCurrency',
                  type: 'select',
                  defaultValue: 'EUR',
                  options: [
                    { label: 'EUR €', value: 'EUR' },
                    { label: 'USD $', value: 'USD' },
                    { label: 'GBP £', value: 'GBP' },
                  ],
                },
                {
                  name: 'availability',
                  type: 'select',
                  defaultValue: 'https://schema.org/InStock',
                  options: [
                    { label: 'For Sale', value: 'https://schema.org/InStock' },
                    { label: 'Sold', value: 'https://schema.org/SoldOut' },
                    { label: 'On Request', value: 'https://schema.org/PreOrder' },
                  ],
                },
                { name: 'inquiryUrl', type: 'text' },
              ],
            },
            {
              name: 'printEditions',
              type: 'array',
              fields: [
                { name: 'editionSize', type: 'number' },
                {
                  name: 'format',
                  type: 'text',
                  admin: { description: 'e.g. A3, 50x70cm' },
                },
                {
                  name: 'substrate',
                  type: 'text',
                  admin: { description: 'e.g. matte paper, dibond' },
                },
                { name: 'price', type: 'number' },
                {
                  name: 'priceCurrency',
                  type: 'select',
                  defaultValue: 'EUR',
                  options: [
                    { label: 'EUR €', value: 'EUR' },
                    { label: 'USD $', value: 'USD' },
                    { label: 'GBP £', value: 'GBP' },
                  ],
                },
                {
                  name: 'availability',
                  type: 'select',
                  defaultValue: 'https://schema.org/InStock',
                  options: [
                    { label: 'Available', value: 'https://schema.org/InStock' },
                    { label: 'Sold Out', value: 'https://schema.org/SoldOut' },
                  ],
                },
              ],
            },
          ],
        },

        // ── TAB 9: SEO ────────────────────────────────────────
        {
          label: 'SEO',
          fields: [
            { name: 'metaTitle', type: 'text', localized: true },
            { name: 'metaDescription', type: 'textarea', localized: true },
            {
              name: 'sameAs',
              type: 'array',
              fields: [
                { name: 'url', type: 'text', required: true },
                { name: 'label', type: 'text' },
              ],
            },
          ],
        },

        // ── TAB 10: A Colorful History ────────────────────────
        {
          label: 'A Colorful History',
          admin: {
            condition: (data) => data?.seriesSlug === 'a-colorful-history',
          },
          fields: [
            {
              name: 'ach_historyText',
              type: 'richText',
              localized: true,
              admin: { description: 'Historical context for AR/app.' },
            },
            {
              name: 'ach_freestyleText',
              type: 'richText',
              localized: true,
            },
            { name: 'ach_wikiLinkEn', type: 'text', label: 'Wikipedia (EN)' },
            { name: 'ach_wikiLinkDe', type: 'text', label: 'Wikipedia (DE)' },
            {
              name: 'ach_arEnabled',
              type: 'checkbox',
              defaultValue: false,
              label: 'AR Enhancement enabled',
            },
            {
              name: 'ach_arVideos',
              type: 'array',
              admin: {
                condition: (data) => Boolean(data?.ach_arEnabled),
              },
              fields: [
                {
                  name: 'videoRole',
                  type: 'select',
                  required: true,
                  options: [
                    { label: 'Making Of', value: 'makingOf' },
                    { label: 'History', value: 'history' },
                    { label: 'Freestyle', value: 'freestyle' },
                    { label: 'Other', value: 'other' },
                  ],
                },
                {
                  name: 'videoType',
                  type: 'select',
                  required: true,
                  options: [
                    { label: 'Upload (R2)', value: 'upload' },
                    { label: 'YouTube', value: 'youtube' },
                    { label: 'Vimeo', value: 'vimeo' },
                    { label: 'Other URL', value: 'url' },
                  ],
                },
                {
                  name: 'videoFile',
                  type: 'upload',
                  relationTo: 'media',
                  admin: { condition: (_, s) => s?.videoType === 'upload' },
                },
                {
                  name: 'videoUrl',
                  type: 'text',
                  admin: { condition: (_, s) => s?.videoType !== 'upload' },
                },
                { name: 'posterImage', type: 'upload', relationTo: 'media' },
                { name: 'title', type: 'text', localized: true },
              ],
            },
          ],
        },

        // ── TAB 11: Digital City Series ───────────────────────
        {
          label: 'Digital City Series',
          admin: {
            condition: (data) => data?.seriesSlug === 'digital-city-series',
          },
          fields: [
            { name: 'dcs_photoTitle', type: 'text', label: 'Original Photo Title' },
            {
              name: 'dcs_cityData',
              type: 'group',
              fields: [
                { name: 'population', type: 'number' },
                { name: 'area', type: 'number', admin: { description: 'km²' } },
                { name: 'density', type: 'number', admin: { description: 'per km²' } },
                { name: 'elevation', type: 'number', admin: { description: 'metres' } },
              ],
            },
            {
              name: 'dcs_videos',
              type: 'array',
              fields: [
                {
                  name: 'videoType',
                  type: 'select',
                  required: true,
                  options: [
                    { label: 'Upload (R2)', value: 'upload' },
                    { label: 'YouTube', value: 'youtube' },
                    { label: 'Vimeo', value: 'vimeo' },
                    { label: 'Other URL', value: 'url' },
                  ],
                },
                {
                  name: 'videoFile',
                  type: 'upload',
                  relationTo: 'media',
                  admin: { condition: (_, s) => s?.videoType === 'upload' },
                },
                {
                  name: 'videoUrl',
                  type: 'text',
                  admin: { condition: (_, s) => s?.videoType !== 'upload' },
                },
                { name: 'posterImage', type: 'upload', relationTo: 'media' },
                { name: 'title', type: 'text', localized: true },
                {
                  name: 'videoRole',
                  type: 'select',
                  options: [
                    { label: 'Making Of', value: 'makingOf' },
                    { label: 'Documentation', value: 'documentation' },
                    { label: 'Other', value: 'other' },
                  ],
                },
              ],
            },
          ],
        },

        // ── TAB 12: Megacities ────────────────────────────────
        {
          label: 'Megacities',
          admin: {
            condition: (data) => data?.seriesSlug === 'megacities',
          },
          fields: [
            {
              name: 'mc_cityData',
              type: 'group',
              fields: [
                { name: 'population', type: 'number' },
                { name: 'area', type: 'number', admin: { description: 'km²' } },
                { name: 'density', type: 'number', admin: { description: 'per km²' } },
                { name: 'elevation', type: 'number', admin: { description: 'metres' } },
              ],
            },
            {
              name: 'mc_videos',
              type: 'array',
              fields: [
                {
                  name: 'videoType',
                  type: 'select',
                  required: true,
                  options: [
                    { label: 'Upload (R2)', value: 'upload' },
                    { label: 'YouTube', value: 'youtube' },
                    { label: 'Vimeo', value: 'vimeo' },
                    { label: 'Other URL', value: 'url' },
                  ],
                },
                {
                  name: 'videoFile',
                  type: 'upload',
                  relationTo: 'media',
                  admin: { condition: (_, s) => s?.videoType === 'upload' },
                },
                {
                  name: 'videoUrl',
                  type: 'text',
                  admin: { condition: (_, s) => s?.videoType !== 'upload' },
                },
                { name: 'posterImage', type: 'upload', relationTo: 'media' },
                { name: 'title', type: 'text', localized: true },
                {
                  name: 'videoRole',
                  type: 'select',
                  options: [
                    { label: 'Making Of', value: 'makingOf' },
                    { label: 'Documentation', value: 'documentation' },
                    { label: 'Other', value: 'other' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
