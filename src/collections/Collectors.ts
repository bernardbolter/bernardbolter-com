import type { CollectionConfig } from 'payload'
import { randomUUID } from 'crypto'

import { authenticatedReadStaffWrite } from '@/access/staffAccess'

const externalIdFields = [
  {
    name: 'type',
    type: 'select' as const,
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
  { name: 'value', type: 'text' as const, required: true },
  { name: 'verified', type: 'checkbox' as const, defaultValue: false },
]

export const Collectors: CollectionConfig = {
  slug: 'collectors',
  labels: { singular: 'Collector', plural: 'Collectors' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'collectionName', 'platformRelationship', 'updatedAt'],
  },
  access: authenticatedReadStaffWrite,
  fields: [
    {
      name: 'collectorId',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        description: 'Stable UUID for this collector account.',
      },
    },
    { name: 'name', type: 'text', required: true },
    { name: 'collectionName', type: 'text' },
    { name: 'collectionFocus', type: 'textarea' },
    { name: 'dealerRelationships', type: 'textarea' },
    { name: 'acquisitionContext', type: 'textarea' },
    {
      name: 'platformRelationship',
      type: 'select',
      options: [
        { label: 'Artist also', value: 'artist-also' },
        { label: 'Collector only', value: 'collector-only' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'platformJoinDate',
      type: 'date',
      admin: { position: 'sidebar' },
    },
    {
      name: 'firstMentionDate',
      type: 'date',
      admin: {
        position: 'sidebar',
        description: 'Earliest reference to this entity across records (entity resolution).',
      },
    },
    {
      name: 'externalIdentifiers',
      type: 'array',
      labels: { singular: 'Identifier', plural: 'External identifiers' },
      fields: externalIdFields,
    },
    {
      name: 'collectionKnowledgeBase',
      type: 'relationship',
      relationTo: 'collection-knowledge',
      hasMany: true,
      admin: {
        description: 'Knowledge docs used to brief collector sessions.',
      },
    },
    {
      type: 'collapsible',
      label: 'Entity resolution',
      admin: { initCollapsed: true },
      fields: [
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
      async ({ data, operation }) => {
        if (operation === 'create' && !data.collectorId) {
          data.collectorId = randomUUID()
        }
        if (operation === 'create' && !data.platformJoinDate) {
          data.platformJoinDate = new Date().toISOString()
        }
        return data
      },
    ],
  },
}
