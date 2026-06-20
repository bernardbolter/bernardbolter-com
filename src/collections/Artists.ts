import type { CollectionConfig, Field } from 'payload'
import { slugField } from 'payload'

import {
  isArtistOrAdmin,
  privateFieldAccess,
  publicReadStaffWriteAccess,
} from '@/access/isArtistOrAdmin'
import { artistAfterChange } from '@/hooks/artistAfterChange'
import { artistBeforeChange } from '@/hooks/artistBeforeChange'

function statementPhotoRowField(
  name: string,
  labels: { singular: string; plural: string },
  description: string,
): Field {
  return {
    name,
    type: 'array',
    labels,
    admin: { description },
    fields: [
      {
        name: 'image',
        type: 'upload',
        relationTo: 'media',
        required: true,
      },
      {
        name: 'caption',
        type: 'text',
        localized: true,
      },
      {
        name: 'imageType',
        type: 'select',
        required: true,
        defaultValue: 'photograph',
        options: [
          { label: 'Photograph (documentation)', value: 'photograph' },
          { label: "Drawing / sketch (artist's own rendering)", value: 'rendering' },
        ],
        admin: {
          description:
            "Caption dot: solid = documentary photograph, hollow = the artist's own interpretive mark.",
        },
      },
    ],
  }
}

export const Artists: CollectionConfig = {
  slug: 'artists',
  labels: { singular: 'Artist', plural: 'Artists' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'nameLegal', 'slug', 'careerStage', 'updatedAt'],
    description:
      'Single artist identity record (JSON-LD creator). Module A — one row for this site.',
  },
  access: {
    read: () => true,
    create: async ({ req }) => {
      if (!req.user || !isArtistOrAdmin(req.user)) return false
      const { totalDocs } = await req.payload.count({ collection: 'artists', req })
      return totalDocs === 0
    },
    update: ({ req: { user } }) => isArtistOrAdmin(user),
    delete: ({ req: { user } }) => isArtistOrAdmin(user),
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      defaultValue: 'Bernard Bolter',
      label: 'Professional name',
      admin: {
        description:
          'Name you work under publicly (e.g. Bernard Bolter). Used for the site, JSON-LD, and slug.',
      },
    },
    {
      name: 'nameLegal',
      type: 'text',
      label: 'Legal / full name',
      admin: {
        description:
          'Full legal name if different (e.g. Bernard John Bolter IV). Used for credits and formal records; optional.',
      },
    },
    slugField({ useAsSlug: 'name' }),
    {
      name: 'cataloguePrefix',
      type: 'text',
      defaultValue: 'BB',
      admin: {
        description:
          'Prefix for catalogue numbers on artworks, e.g. BB in BB-ACH-2019-003.',
      },
    },
    {
      name: 'birthCity',
      type: 'text',
      label: 'Birth city',
      defaultValue: 'San Francisco',
      admin: { description: 'Shown in the site info panel (e.g. b. San Francisco, 1974).' },
    },
    {
      name: 'birthYear',
      type: 'number',
      label: 'Birth year',
      defaultValue: 1974,
      admin: { description: 'Shown in the site info panel.' },
    },
    {
      name: 'workCity1',
      type: 'text',
      label: 'Work city 1',
      defaultValue: 'Berlin',
      admin: { description: 'First city in “Lives and works …” on the info panel.' },
    },
    {
      name: 'workCity2',
      type: 'text',
      label: 'Work city 2',
      defaultValue: 'San Francisco',
      admin: { description: 'Second city in “Lives and works …” on the info panel.' },
    },
    {
      name: 'careerStage',
      type: 'select',
      defaultValue: 'studio',
      options: [
        { label: 'Studio', value: 'studio' },
        { label: 'Market', value: 'market' },
        { label: 'Institutional', value: 'institutional' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'primaryActorType',
      type: 'select',
      options: [
        { label: 'Artist', value: 'artist' },
        { label: 'Collector', value: 'collector' },
        { label: 'Gallery', value: 'gallery' },
        { label: 'Artist + Collector', value: 'artist-collector' },
        { label: 'Artist + Gallery', value: 'artist-gallery' },
        { label: 'Artist + Collector + Gallery', value: 'artist-collector-gallery' },
      ],
      admin: {
        position: 'sidebar',
        condition: () => false,
        description: 'Hidden on this site — artist, gallery, and collector are separate properties.',
      },
    },
    {
      name: 'actorRoles',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Artist', value: 'artist' },
        { label: 'Collector', value: 'collector' },
        { label: 'Gallery', value: 'gallery' },
      ],
      admin: {
        position: 'sidebar',
        condition: () => false,
      },
    },
    {
      name: 'platformJoinDate',
      type: 'date',
      admin: {
        position: 'sidebar',
        description: 'Set automatically when the record is first created.',
      },
    },
    {
      name: 'externalIdentifiers',
      type: 'array',
      labels: { singular: 'Identifier', plural: 'External identifiers' },
      fields: [
        {
          name: 'type',
          type: 'select',
          required: true,
          options: [
            { label: 'Website', value: 'website' },
            { label: 'Instagram', value: 'instagram' },
            { label: 'Artnet', value: 'artnet' },
            { label: 'Artsy', value: 'artsy' },
            { label: 'Wikidata', value: 'wikidata' },
            { label: 'ULAN', value: 'ulan' },
            { label: 'JSON-LD', value: 'json-ld' },
            { label: 'Google Knowledge Graph', value: 'google-knowledge-graph' },
          ],
        },
        { name: 'value', type: 'text', required: true },
        { name: 'verified', type: 'checkbox', defaultValue: false },
      ],
    },
    {
      name: 'ulanUri',
      type: 'text',
      admin: {
        description: 'Getty ULAN URI, e.g. http://vocab.getty.edu/ulan/500xxxxxx',
      },
    },
    {
      name: 'wikidataUri',
      type: 'text',
      admin: {
        description: 'Wikidata entity URI, e.g. https://www.wikidata.org/entity/Qxxxxxx',
      },
    },
    {
      name: 'canonicalDomain',
      type: 'text',
      admin: {
        description:
          'Authoritative archive URL (e.g. https://bernardbolter.com). Defaults from site URL when empty; editable for corrections.',
      },
    },
    {
      name: 'archivePublicKey',
      type: 'text',
      admin: {
        description:
          'Public key for cryptographic attestation of published records. Optional until verification is implemented.',
      },
    },
    {
      name: 'bioFull',
      type: 'richText',
      localized: true,
    },
    {
      name: 'bioMedium',
      type: 'richText',
      localized: true,
    },
    {
      name: 'bioShort',
      type: 'text',
      localized: true,
      admin: { description: 'Single sentence, third person (plain text).' },
    },
    {
      name: 'statementFooterImages',
      type: 'array',
      labels: { singular: 'Footer image', plural: 'Statement footer images' },
      admin: {
        description:
          'Full-width images below the artist statement on /cv only. The /statement page uses statementSceneImagesFirst and statementSceneImagesSecond instead.',
      },
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
      ],
    },
    {
      name: 'bioPhotos',
      type: 'array',
      labels: { singular: 'Photo', plural: 'Bio page photos' },
      admin: {
        description:
          'Photo grid on the Bio page. Order here controls display order. Mix of studio shots, install shots, and personal/origin images — captions carry the story.',
      },
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
        {
          name: 'caption',
          type: 'text',
          localized: true,
          admin: {
            description:
              'E.g. "Bernard Bolter in his studio at Markgraffendamm, Berlin" or "Digital City Series exhibition at Book & Job Gallery, San Francisco, 2013".',
          },
        },
        {
          name: 'relatedEvent',
          type: 'relationship',
          relationTo: 'events',
          admin: {
            description:
              'Optional. When this photo documents an exhibition/event with a published page (hasPage: true), the caption links to it. Leave empty for studio/personal photos.',
          },
        },
      ],
    },
    {
      name: 'statementOpening',
      type: 'richText',
      localized: true,
      admin: {
        description:
          "Opening section at the top of /statement. Drop cap applies to this section's first paragraph only.",
      },
    },
    {
      name: 'statementPullQuote',
      type: 'text',
      localized: true,
      admin: {
        description:
          'Breakout pull quote after the opening section and before the first photo row.',
      },
    },
    statementPhotoRowField(
      'statementSceneImagesFirst',
      { singular: 'Scene image', plural: 'Statement first-row photos' },
      'First photo row on /statement — typically two images in a 2-column grid, after the pull quote.',
    ),
    {
      name: 'statementMiddleBody',
      type: 'richText',
      localized: true,
      admin: {
        description:
          'Middle prose section on /statement — rendered after the first photo row and before the second.',
      },
    },
    statementPhotoRowField(
      'statementSceneImagesSecond',
      { singular: 'Scene image', plural: 'Statement second-row photos' },
      'Second photo row on /statement — typically two images in a 2-column grid, after the middle body.',
    ),
    {
      name: 'statementClosingBody',
      type: 'richText',
      localized: true,
      admin: {
        description:
          'Final paragraphs on /statement — rendered after the second photo row and before the closing line.',
      },
    },
    {
      name: 'statementFull',
      type: 'richText',
      localized: true,
    },
    {
      name: 'statementMedium',
      type: 'richText',
      localized: true,
    },
    {
      name: 'statementShort',
      type: 'text',
      localized: true,
      admin: { description: 'One to two sentences (plain text).' },
    },
    {
      name: 'statementClosingLine',
      type: 'text',
      localized: true,
      admin: {
        description:
          'Optional. Single line rendered as a full-bleed typographic closing block on /statement. May also remain in statementFull prose intentionally.',
      },
    },
    {
      name: 'statementRelatedWorks',
      type: 'array',
      labels: { singular: 'Related work', plural: 'Statement related works' },
      admin: {
        description:
          'Artworks referenced directly in the artist statement — e.g. a video series documenting an event described in the text. Order here is display order. Manual curation only.',
      },
      fields: [
        {
          name: 'artwork',
          type: 'relationship',
          relationTo: 'artworks',
          required: true,
          filterOptions: {
            status: { equals: 'published' },
          },
        },
        {
          name: 'note',
          type: 'text',
          localized: true,
          admin: {
            description:
              'Optional short context line, e.g. "Part I — the installation". Leave blank to show title and year only.',
          },
        },
      ],
    },
    {
      name: 'statementLastRevised',
      type: 'date',
      admin: {
        description:
          'Set manually when the artist statement text is meaningfully revised. Drives JSON-LD dateModified for /statement only — not auto-updated.',
      },
    },
    {
      name: 'datenschutzFull',
      type: 'richText',
      localized: true,
      admin: {
        description: 'Privacy policy (Datenschutz) — rendered on /datenschutz.',
      },
    },
    {
      name: 'practiceNote',
      type: 'richText',
      localized: true,
      admin: {
        description: 'How of making — populated gradually via cataloguing sessions.',
      },
    },
    {
      name: 'creditLine',
      type: 'text',
      localized: true,
      admin: { description: 'Canonical attribution string for listings and loans.' },
    },
    {
      type: 'collapsible',
      label: 'Contact page',
      admin: {
        initCollapsed: false,
        description: 'Availability, provenance copy, social channels, and Impressum for /contact.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'contactStatus',
              type: 'select',
              defaultValue: 'available',
              options: [
                { label: 'Available', value: 'available' },
                { label: 'Away — slow to respond', value: 'away' },
                { label: 'Not currently available', value: 'unavailable' },
              ],
              admin: {
                width: '50%',
                description:
                  'Update this to reflect your current availability. Shown on the contact page.',
              },
            },
            {
              name: 'contactStatusNote',
              type: 'text',
              admin: {
                width: '50%',
                description:
                  'Optional one-line note shown alongside the status on the contact page.',
              },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'contactPhoto',
              type: 'upload',
              relationTo: 'media',
              admin: {
                width: '50%',
                description:
                  'Studio portrait on the contact page (portrait orientation, 3:4 display).',
              },
            },
            {
              name: 'contactPhotoCaption',
              type: 'text',
              localized: true,
              admin: {
                width: '50%',
                description:
                  'Optional one-line caption under the studio photo on the contact page.',
              },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'whatsappNumber',
              type: 'text',
              admin: {
                width: '50%',
                description:
                  'WhatsApp number in international format without spaces, e.g. 49171234567.',
              },
            },
            {
              name: 'whatsappPrefilledMessage',
              type: 'text',
              admin: {
                width: '50%',
                description: 'Optional pre-filled message for wa.me links on the contact page.',
              },
            },
          ],
        },
        {
          name: 'socialChannels',
          type: 'group',
          fields: [
            { name: 'instagram', type: 'text', label: 'Instagram URL' },
            { name: 'facebook', type: 'text', label: 'Facebook URL' },
            { name: 'youtube', type: 'text', label: 'YouTube URL' },
            { name: 'vimeo', type: 'text', label: 'Vimeo URL' },
            { name: 'linkedin', type: 'text', label: 'LinkedIn URL' },
            { name: 'tiktok', type: 'text', label: 'TikTok URL' },
          ],
          admin: {
            description:
              'Leave blank any platform not in active use. Populated platforms appear on the site.',
          },
        },
        {
          name: 'primarySocialChannel',
          type: 'select',
          options: [
            { label: 'Instagram', value: 'instagram' },
            { label: 'Facebook', value: 'facebook' },
            { label: 'YouTube', value: 'youtube' },
            { label: 'Vimeo', value: 'vimeo' },
            { label: 'LinkedIn', value: 'linkedin' },
            { label: 'TikTok', value: 'tiktok' },
          ],
          admin: {
            description:
              'Platform where you actively respond to DMs — highlighted on the contact page.',
          },
        },
        {
          name: 'contactProvenanceText',
          type: 'richText',
          localized: true,
          admin: {
            description:
              'Provenance invitation — explains what provenance means here and invites owners to get in touch.',
          },
        },
        {
          name: 'contactThankYouText',
          type: 'richText',
          localized: true,
          admin: {
            description: 'Optional personal note of thanks to collectors and supporters.',
          },
        },
        {
          name: 'contactCorrectionsText',
          type: 'richText',
          localized: true,
          admin: {
            description:
              'Optional invitation for archive materials — photographs, catalogues, exhibition records.',
          },
        },
        {
          name: 'contactEnquiryIntro',
          type: 'richText',
          localized: true,
          admin: {
            description:
              'Short intro above the contact form — commissions, exhibition proposals, general questions.',
          },
        },
        {
          name: 'impressum',
          type: 'group',
          access: {
            read: publicReadStaffWriteAccess.read,
            update: publicReadStaffWriteAccess.update,
          },
          fields: [
            { name: 'legalName', type: 'text', label: 'Full legal name' },
            { name: 'streetAddress', type: 'text', label: 'Street address' },
            { name: 'postalCode', type: 'text', label: 'Postal code' },
            { name: 'city', type: 'text', label: 'City' },
            { name: 'country', type: 'text', label: 'Country' },
            { name: 'publicEmail', type: 'email', label: 'Public contact email' },
            {
              name: 'kleinunternehmerText',
              type: 'textarea',
              label: 'Kleinunternehmer legal text',
            },
          ],
        },
      ],
    },
    {
      name: 'locations',
      type: 'array',
      labels: { singular: 'Location', plural: 'Locations' },
      fields: [
        { name: 'city', type: 'text', required: true },
        { name: 'country', type: 'text', required: true },
        {
          name: 'type',
          type: 'select',
          required: true,
          options: [
            { label: 'Studio', value: 'studio' },
            { label: 'Residence', value: 'residence' },
            { label: 'Live-work', value: 'live-work' },
          ],
        },
        { name: 'primary', type: 'checkbox', defaultValue: false },
        { name: 'current', type: 'checkbox', defaultValue: true },
        {
          name: 'startYear',
          type: 'number',
          admin: { description: 'Year this base was established (optional).' },
        },
        {
          name: 'streetAddress',
          type: 'text',
          admin: {
            description:
              'Optional. Shown on the contact page for studio locations only — not for home/residence entries.',
          },
        },
        {
          name: 'postalCode',
          type: 'text',
          admin: {
            description: 'Optional postal code for this location (used on the contact page and in JSON-LD).',
          },
        },
        {
          name: 'buildingName',
          type: 'text',
          admin: {
            description: 'Optional. E.g. "CANK, 3rd floor". Shown on the contact page.',
          },
        },
        {
          name: 'showOnContactPage',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            condition: (_data, siblingData) => siblingData?.type !== 'residence',
            description:
              'When true, renders as a card with address and map on /contact. Only for Studio or Live-work locations — change the type above if this is a mappable studio.',
          },
        },
        {
          name: 'mapImage',
          type: 'upload',
          relationTo: 'media',
          admin: {
            condition: (_data, siblingData) => siblingData?.type !== 'residence',
            description:
              'Required when showOnContactPage is true. Pre-rendered static map image (Mapbox export, ~16:10).',
          },
        },
        {
          name: 'mapLinkUrl',
          type: 'text',
          admin: {
            condition: (_data, siblingData) => siblingData?.type !== 'residence',
            description:
              'Optional Google Maps URL — whole card links out when set. Leave blank for a non-clickable card.',
          },
        },
      ],
    },
    {
      name: 'publicEmail',
      type: 'text',
      access: privateFieldAccess,
      admin: {
        description: 'Contact form destination — never render as raw text on the public site.',
      },
    },
    { name: 'website', type: 'text' },
    {
      name: 'otherLinks',
      type: 'array',
      labels: { singular: 'Website link', plural: 'Info panel website links' },
      admin: {
        description:
          'External sites shown in the left info menu (label + URL). Reorder, add, or remove rows here.',
      },
      defaultValue: [
        { label: 'acolorfulhistory.com', url: 'https://acolorfulhistory.com' },
        { label: 'digitalcityseries.com', url: 'https://digitalcityseries.com' },
        { label: 'smoothism.com', url: 'https://smoothism.com' },
      ],
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
          admin: { description: 'Display text, e.g. acolorfulhistory.com' },
        },
        { name: 'url', type: 'text', required: true },
      ],
    },
    {
      name: 'education',
      type: 'array',
      labels: { singular: 'Entry', plural: 'Education (CV)' },
      fields: [
        { name: 'institution', type: 'text', required: true },
        { name: 'degree', type: 'text' },
        { name: 'subject', type: 'text' },
        { name: 'yearStart', type: 'number' },
        { name: 'yearEnd', type: 'number' },
        { name: 'city', type: 'text' },
        { name: 'country', type: 'text' },
        { name: 'cvVisible', type: 'checkbox', defaultValue: true },
      ],
    },
    {
      name: 'selectedCollections',
      type: 'array',
      labels: { singular: 'Holding', plural: 'Selected collections (CV)' },
      fields: [
        { name: 'institutionName', type: 'text', required: true },
        { name: 'city', type: 'text' },
        { name: 'country', type: 'text' },
        { name: 'acquisitionYear', type: 'number' },
        { name: 'cvVisible', type: 'checkbox', defaultValue: true },
        {
          name: 'sourceOfTruth',
          type: 'select',
          defaultValue: 'manual',
          options: [
            { label: 'Manual', value: 'manual' },
            { label: 'Derived', value: 'derived' },
          ],
        },
        {
          name: 'linkedArtworkId',
          type: 'relationship',
          relationTo: 'artworks',
          admin: { description: 'Optional link for future derivation workflows.' },
        },
      ],
    },
  ],
  hooks: {
    afterChange: [artistAfterChange],
    beforeChange: [
      artistBeforeChange,
      async ({ data, operation }) => {
        if (operation === 'create' && !data.platformJoinDate) {
          data.platformJoinDate = new Date().toISOString()
        }
        return data
      },
    ],
  },
}
