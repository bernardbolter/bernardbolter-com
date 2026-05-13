import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

import { publicReadStaffCollectionAccess } from '@/access/staffAccess'

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

const mergeCandidateFields = [
  {
    name: 'candidateType',
    type: 'select' as const,
    required: true,
    options: [
      { label: 'Artist', value: 'artist' },
      { label: 'Collector', value: 'collector' },
      { label: 'Gallery', value: 'gallery' },
      { label: 'Event', value: 'event' },
    ],
  },
  { name: 'candidateId', type: 'text' as const, required: true },
  {
    name: 'matchConfidence',
    type: 'select' as const,
    options: [
      { label: 'High', value: 'high' },
      { label: 'Medium', value: 'medium' },
      { label: 'Low', value: 'low' },
    ],
  },
  { name: 'matchBasis', type: 'textarea' as const },
  {
    name: 'status',
    type: 'select' as const,
    defaultValue: 'pending',
    options: [
      { label: 'Pending', value: 'pending' },
      { label: 'Confirmed', value: 'confirmed' },
      { label: 'Declined', value: 'declined' },
    ],
  },
]

export const Galleries: CollectionConfig = {
  slug: 'galleries',
  labels: { singular: 'Gallery', plural: 'Galleries' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'location', 'updatedAt'],
  },
  access: publicReadStaffCollectionAccess,
  fields: [
    { name: 'name', type: 'text', required: true },
    slugField({ useAsSlug: 'name' }),
    { name: 'programmeFocus', type: 'textarea' },
    { name: 'location', type: 'text' },
    { name: 'foundingYear', type: 'number', admin: { position: 'sidebar' } },
    {
      name: 'platformJoinDate',
      type: 'date',
      admin: { position: 'sidebar' },
    },
    {
      name: 'firstMentionDate',
      type: 'date',
      admin: { position: 'sidebar' },
    },
    {
      name: 'externalIdentifiers',
      type: 'array',
      labels: { singular: 'Identifier', plural: 'External identifiers' },
      fields: externalIdFields,
    },
    {
      name: 'representedArtists',
      type: 'array',
      labels: { singular: 'Representation', plural: 'Represented artists' },
      fields: [
        {
          name: 'artistId',
          type: 'relationship',
          relationTo: 'artists',
          required: true,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          defaultValue: 'active',
          options: [
            { label: 'Active', value: 'active' },
            { label: 'Historical', value: 'historical' },
          ],
        },
        { name: 'startDate', type: 'date' },
        { name: 'endDate', type: 'date' },
      ],
    },
    {
      name: 'galleryKnowledgeBase',
      type: 'relationship',
      relationTo: 'gallery-knowledge',
      hasMany: true,
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
          fields: mergeCandidateFields,
        },
      ],
    },
  ],
}
