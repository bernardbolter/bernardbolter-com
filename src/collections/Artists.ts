import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

import { isArtistOrAdmin, privateFieldAccess } from '@/access/isArtistOrAdmin'

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
    { name: 'instagramUrl', type: 'text' },
    {
      name: 'otherLinks',
      type: 'array',
      labels: { singular: 'Link', plural: 'Other links' },
      fields: [
        { name: 'label', type: 'text', required: true },
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
    beforeChange: [
      async ({ data, operation }) => {
        if (operation === 'create' && !data.platformJoinDate) {
          data.platformJoinDate = new Date().toISOString()
        }
        return data
      },
    ],
  },
}
