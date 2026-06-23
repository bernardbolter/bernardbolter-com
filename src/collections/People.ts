import type { CollectionConfig } from 'payload'

import { isArtistOrAdmin, privateFieldAccess } from '@/access/isArtistOrAdmin'

const roleOptions = [
  { label: 'Curator', value: 'curator' },
  { label: 'Gallerist', value: 'gallerist' },
  { label: 'Organiser', value: 'organiser' },
  { label: 'Artist', value: 'artist' },
  { label: 'Collector', value: 'collector' },
  { label: 'Critic / Writer', value: 'critic' },
  { label: 'Collaborator', value: 'collaborator' },
  { label: 'Publisher', value: 'publisher' },
  { label: 'Educator', value: 'educator' },
  { label: 'Institution', value: 'institution' },
  { label: 'Other', value: 'other' },
] as const

export const People: CollectionConfig = {
  slug: 'people',
  access: {
    read: () => true,
    create: ({ req: { user } }) => isArtistOrAdmin(user),
    update: ({ req: { user } }) => isArtistOrAdmin(user),
    delete: ({ req: { user } }) => isArtistOrAdmin(user),
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'role', 'instagram', 'wikidataUri'],
    description:
      'Curators, organisers, gallerists, co-exhibitors, collaborators, and other people connected to events or artworks. One record per person — reuse across events rather than creating duplicates.',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'nameLegal',
      type: 'text',
      admin: { description: 'Full legal name if different from display name. Used for JSON-LD.' },
    },
    {
      name: 'role',
      type: 'select',
      hasMany: true,
      options: [...roleOptions],
      admin: {
        description:
          'One person can hold multiple roles across different contexts. Select all that apply.',
      },
    },
    {
      name: 'roleNote',
      type: 'text',
      admin: {
        description:
          'If role includes "Other", describe it here. Also use for context-specific role clarification.',
        condition: (data) => Array.isArray(data.role) && data.role.includes('other'),
      },
    },
    {
      name: 'website',
      type: 'text',
      admin: { description: 'Primary website URL.' },
    },
    {
      name: 'instagram',
      type: 'text',
      admin: { description: 'Handle only, e.g. @juergenbluemlein — no full URL.' },
    },
    {
      name: 'wikidataUri',
      type: 'text',
      admin: { description: 'e.g. https://www.wikidata.org/entity/Q12345' },
    },
    {
      name: 'ulanUri',
      type: 'text',
      admin: { description: 'Getty ULAN URI — primarily for artists.' },
    },
    {
      name: 'externalIdentifiers',
      type: 'array',
      admin: { description: 'Any additional authority identifiers not covered above.' },
      fields: [
        {
          name: 'type',
          type: 'select',
          options: [
            { label: 'ISNI', value: 'isni' },
            { label: 'ORCID', value: 'orcid' },
            { label: 'VIAF', value: 'viaf' },
            { label: 'Library of Congress', value: 'loc' },
            { label: 'Other', value: 'other' },
          ],
        },
        { name: 'value', type: 'text' },
        { name: 'uri', type: 'text', admin: { description: 'Full URI for this identifier.' } },
      ],
    },
    {
      name: 'note',
      type: 'textarea',
      access: privateFieldAccess,
      admin: {
        description:
          'Internal context note — who this person is, how they connect to the practice. Never exposed publicly or in JSON-LD.',
      },
    },
  ],
}
