import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

import { isArtistOrAdmin } from '@/access/isArtistOrAdmin'

export const Artists: CollectionConfig = {
  slug: 'artists',
  labels: { singular: 'Artist', plural: 'Artists' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'careerStage', 'updatedAt'],
    description:
      'Canonical artist identity records (JSON-LD creator/performer). Single-tenant: one primary row.',
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => isArtistOrAdmin(user),
    update: ({ req: { user } }) => isArtistOrAdmin(user),
    delete: ({ req: { user } }) => isArtistOrAdmin(user),
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      defaultValue: 'Bernard Bolter',
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
      admin: { position: 'sidebar' },
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
      admin: { position: 'sidebar' },
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
            { label: 'Wikidata', value: 'wikidata' },
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
      name: 'bio',
      type: 'richText',
      localized: true,
    },
    {
      name: 'statement',
      type: 'richText',
      localized: true,
    },
    {
      type: 'collapsible',
      label: 'Entity resolution',
      admin: { initCollapsed: true },
      fields: [
        {
          name: 'firstMentionDate',
          type: 'date',
          admin: {
            description: 'Earliest reference to this entity across records.',
          },
        },
        {
          name: 'mergeCandidates',
          type: 'array',
          labels: { singular: 'Candidate', plural: 'Merge candidates' },
          fields: [
            {
              name: 'candidateType',
              type: 'select',
              required: true,
              options: [
                { label: 'Artist', value: 'artist' },
                { label: 'Collector', value: 'collector' },
                { label: 'Gallery', value: 'gallery' },
                { label: 'Event', value: 'event' },
              ],
            },
            { name: 'candidateId', type: 'text', required: true },
            {
              name: 'matchConfidence',
              type: 'select',
              options: [
                { label: 'High', value: 'high' },
                { label: 'Medium', value: 'medium' },
                { label: 'Low', value: 'low' },
              ],
            },
            { name: 'matchBasis', type: 'textarea' },
            {
              name: 'status',
              type: 'select',
              defaultValue: 'pending',
              options: [
                { label: 'Pending', value: 'pending' },
                { label: 'Confirmed', value: 'confirmed' },
                { label: 'Declined', value: 'declined' },
              ],
            },
          ],
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation === 'create' && !data.platformJoinDate) {
          data.platformJoinDate = new Date().toISOString()
        }
        return data
      },
    ],
  },
}
