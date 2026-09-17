import type { CollectionConfig } from 'payload'

import { isArtistOrAdmin } from '@/access/isArtistOrAdmin'
import {
  NEIGHBORHOOD_COMMISSION_CITY_DEFAULT,
  NEIGHBORHOOD_COMMISSION_CITY_OPTIONS,
  NEIGHBORHOOD_SOURCE_STATUS_OPTIONS,
  SOURCE_LICENSE_OPTIONS,
} from '@/fields/neighborhoodCommissionShared'

/**
 * Tier 1 inventory for ACH Neighborhood Commissions — sourced historical photos
 * not yet painted. Metadata mirrors Artworks.ach.sourcePhotograph.
 */
export const AchNeighborhoodSources: CollectionConfig = {
  slug: 'ach-neighborhood-sources',
  labels: {
    singular: 'ACH neighborhood source',
    plural: 'ACH neighborhood sources',
  },
  admin: {
    useAsTitle: 'sourceTitle',
    defaultColumns: ['sourceTitle', 'neighborhood', 'city', 'status', 'published', 'sortOrder'],
    description:
      'Unpainted historical neighborhood photos for the Neighborhood Commissions Tier 1 browse grid (ACH).',
  },
  access: {
    read: ({ req: { user } }) => {
      if (isArtistOrAdmin(user)) return true
      return { published: { equals: true } }
    },
    create: ({ req: { user } }) => isArtistOrAdmin(user),
    update: ({ req: { user } }) => isArtistOrAdmin(user),
    delete: ({ req: { user } }) => isArtistOrAdmin(user),
  },
  fields: [
    {
      name: 'published',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'When on, visible to ACH / public API.',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'available',
      options: [...NEIGHBORHOOD_SOURCE_STATUS_OPTIONS],
      admin: {
        position: 'sidebar',
        description: 'Inventory workflow: available → held → commissioned → painted.',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        description: 'Lower numbers appear first in the Tier 1 grid.',
      },
    },
    {
      name: 'city',
      type: 'select',
      required: true,
      defaultValue: NEIGHBORHOOD_COMMISSION_CITY_DEFAULT,
      options: [...NEIGHBORHOOD_COMMISSION_CITY_OPTIONS],
      index: true,
      admin: {
        description: 'City slug for future /neighborhood/[city] filtering.',
      },
    },
    {
      name: 'neighborhood',
      type: 'text',
      required: true,
      admin: {
        description: 'District or neighbourhood label (e.g. Sunset, Mission).',
      },
    },
    {
      name: 'sourceImage',
      type: 'upload',
      relationTo: 'media',
      required: true,
      admin: {
        description: 'The historical photograph offered as commission source material.',
      },
    },
    {
      name: 'sourceImageAltText',
      type: 'text',
      localized: true,
      admin: { description: 'Alt text for the source photograph.' },
    },
    {
      name: 'sourceTitle',
      type: 'text',
      localized: true,
      admin: { description: 'Title as known in the archive or catalogue.' },
    },
    {
      name: 'sourceCreator',
      type: 'text',
      admin: {
        description: 'Photographer or institution if individual creator unknown.',
      },
    },
    {
      name: 'sourceCreatorWikidataUri',
      type: 'text',
      admin: { description: 'Wikidata entity for the photographer or institution.' },
    },
    {
      name: 'approximateDate',
      type: 'text',
      admin: { description: 'Human-readable date. e.g. c. 1861 or 1895–1900.' },
    },
    {
      name: 'imageCaptureType',
      type: 'relationship',
      relationTo: 'image-capture-technologies',
      admin: {
        description: 'The technology used to make this source photograph.',
      },
    },
    {
      name: 'sourceWikidataUri',
      type: 'text',
      admin: {
        description: 'Wikidata entity for this specific photograph, if one exists.',
      },
    },
    {
      name: 'sourceWikimediaCommonsUrl',
      type: 'text',
      admin: { description: 'Full Wikimedia Commons file-page URL.' },
    },
    {
      name: 'sourceInstitution',
      type: 'text',
      admin: {
        description: 'Archive, museum, or library holding the original.',
      },
    },
    {
      name: 'sourceInstitutionWikidataUri',
      type: 'text',
      admin: { description: 'Wikidata entity for the holding institution.' },
    },
    {
      name: 'sourceInstitutionUrl',
      type: 'text',
      admin: {
        description: 'Direct URL to the institution catalogue record, if one exists.',
      },
    },
    {
      name: 'sourceLicense',
      type: 'select',
      options: [...SOURCE_LICENSE_OPTIONS],
      admin: { description: 'License under which the source photograph is used.' },
    },
    {
      name: 'sourceLicenseUrl',
      type: 'text',
      admin: { description: 'URL to the specific license.' },
    },
    {
      name: 'sourceCredit',
      type: 'text',
      admin: {
        description:
          'Attribution string for display (creator, title, date, institution, license).',
      },
    },
    {
      name: 'resultingArtwork',
      type: 'relationship',
      relationTo: 'artworks',
      admin: {
        description: 'Set when a commission from this source is completed and catalogued.',
      },
    },
  ],
}
