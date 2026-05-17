import type {
  CollectionBeforeChangeHook,
  CollectionBeforeValidateHook,
  CollectionConfig,
} from 'payload'

import { isArtistOrAdmin } from '@/access/isArtistOrAdmin'

function slugify(input: string): string {
  return input
    .toString()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/**
 * Slug is generated from `name` on create and locked thereafter — per Part 1 spec:
 * "Auto-generated from name. Unique. Never changes after first publication."
 */
const lockSlug: CollectionBeforeChangeHook = ({ data, operation, originalDoc }) => {
  if (operation === 'create') {
    if (!data.slug || !String(data.slug).trim()) {
      const seed =
        (data.name && typeof data.name === 'object'
          ? Object.values(data.name as Record<string, string>).find(Boolean)
          : data.name) ?? ''
      data.slug = slugify(String(seed))
    } else {
      data.slug = slugify(String(data.slug))
    }
    return data
  }
  if (originalDoc?.slug) {
    data.slug = originalDoc.slug
  }
  return data
}

const requireSlugAfterChange: CollectionBeforeValidateHook = ({ data }) => {
  if (!data) return data
  if (data.slug == null || String(data.slug).trim() === '') {
    if (data.name && typeof data.name === 'string') {
      data.slug = slugify(data.name)
    }
  }
  return data
}

export const ImageCaptureTechnologies: CollectionConfig = {
  slug: 'image-capture-technologies',
  labels: { singular: 'Image capture technology', plural: 'Image capture technologies' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'approximatePeriodStart', 'approximatePeriodEnd'],
    description:
      'Photographic and image-making technologies referenced by ACH source photographs.',
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => isArtistOrAdmin(user),
    update: ({ req: { user } }) => isArtistOrAdmin(user),
    delete: ({ req: { user } }) => isArtistOrAdmin(user),
  },
  hooks: {
    beforeValidate: [requireSlugAfterChange],
    beforeChange: [lockSlug],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      localized: true,
      admin: {
        description: 'Display name. e.g. Daguerreotype, Wet plate collodion.',
      },
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Auto-generated from name on create; immutable thereafter.',
      },
    },
    {
      name: 'description',
      type: 'richText',
      localized: true,
      admin: {
        description:
          'What this technology is, how it works, what distinguishes its visual qualities.',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'approximatePeriodStart',
          type: 'number',
          admin: {
            width: '50%',
            description: 'Four-digit year this technology came into widespread use.',
          },
        },
        {
          name: 'approximatePeriodEnd',
          type: 'number',
          admin: {
            width: '50%',
            description: 'Four-digit year it fell out of common use. Leave null if still active.',
          },
        },
      ],
    },
    {
      name: 'exampleImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: "Representative example illustrating the technology's visual character.",
      },
    },
    {
      name: 'exampleImageCredit',
      type: 'text',
      admin: {
        description: 'Attribution string for the example image.',
      },
    },
    {
      name: 'wikidataUri',
      type: 'text',
      admin: {
        description:
          'Wikidata entity URI. e.g. https://www.wikidata.org/entity/Q178227 (Daguerreotype).',
      },
    },
    {
      name: 'wikipediaUrl',
      type: 'text',
      localized: true,
      admin: {
        description:
          'Wikipedia article URL. Localized — EN and DE link to their respective language editions.',
      },
    },
  ],
}
