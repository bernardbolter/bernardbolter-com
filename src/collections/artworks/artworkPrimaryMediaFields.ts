import type { Field } from 'payload'

/** Top-of-form primary + poster uploads with alt text (Payload shows upload previews inline). */
export const artworkPrimaryMediaFields: Field[] = [
  {
    type: 'collapsible',
    label: 'Primary media',
    admin: {
      initCollapsed: false,
      description:
        'Primary image is the canonical artwork file. Poster image is used for thumbnails, social, and video stills.',
    },
    fields: [
      {
        type: 'row',
        fields: [
          {
            name: 'primaryImage',
            type: 'upload',
            relationTo: 'media',
            admin: {
              width: '50%',
              description: 'Canonical high-res image for this work.',
            },
          },
          {
            name: 'primaryImageAltText',
            type: 'text',
            localized: true,
            admin: {
              width: '50%',
              description: 'Alt text for the primary image.',
            },
          },
        ],
      },
      {
        type: 'row',
        fields: [
          {
            name: 'posterImage',
            type: 'upload',
            relationTo: 'media',
            admin: {
              width: '50%',
              description: 'Thumbnail / social / timeline / video poster still.',
            },
          },
          {
            name: 'posterImageAltText',
            type: 'text',
            localized: true,
            admin: {
              width: '50%',
              description: 'Alt text for the poster image.',
            },
          },
        ],
      },
    ],
  },
]
