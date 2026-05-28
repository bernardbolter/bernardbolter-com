import type { CollectionConfig } from 'payload'
import { randomUUID } from 'crypto'

import { authenticatedReadStaffWrite } from '@/access/staffAccess'

export const Sessions: CollectionConfig = {
  slug: 'sessions',
  labels: { singular: 'Session', plural: 'Sessions' },
  admin: {
    useAsTitle: 'sessionId',
    defaultColumns: [
      'sessionType',
      'status',
      'artworkRecord',
      'dialogueRefinementFlag',
      'createdAt',
    ],
    description: 'Art/Official session transcripts (not exposed to anonymous API).',
  },
  access: authenticatedReadStaffWrite,
  fields: [
    {
      name: 'sessionId',
      type: 'text',
      unique: true,
      index: true,
      admin: { readOnly: true },
    },
    {
      name: 'sessionType',
      type: 'select',
      required: true,
      options: [
        { label: 'Artwork cataloguing', value: 'artwork-cataloguing' },
        { label: 'Triptych cataloguing', value: 'triptych-cataloguing' },
        { label: 'Artist statement', value: 'artist-statement' },
        { label: 'Biography', value: 'biography' },
        { label: 'Onboarding', value: 'onboarding' },
        { label: 'Episode storyboard', value: 'episode-storyboard' },
        { label: 'Episode assembly', value: 'episode-assembly' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'in-progress',
      options: [
        { label: 'In progress', value: 'in-progress' },
        { label: 'Completed', value: 'completed' },
        { label: 'Abandoned', value: 'abandoned' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'artistId',
      type: 'relationship',
      relationTo: 'artists',
      admin: { position: 'sidebar' },
    },
    {
      name: 'artworkRecord',
      type: 'relationship',
      relationTo: 'artworks',
      admin: { position: 'sidebar' },
    },
    {
      name: 'triptychRecord',
      type: 'relationship',
      relationTo: 'triptychs',
      admin: {
        position: 'sidebar',
        description: 'Optional — link when refining an existing triptych corpus.',
      },
    },
    {
      name: 'lines',
      type: 'relationship',
      relationTo: 'lines',
      hasMany: true,
      admin: {
        position: 'sidebar',
        description: 'Active Lines this session contributes to.',
      },
    },
    {
      name: 'completedAt',
      type: 'date',
      admin: { position: 'sidebar' },
    },
    {
      name: 'messages',
      type: 'json',
      admin: { description: 'Full Anthropic message array (opaque).' },
    },
    {
      name: 'preUploadStep',
      type: 'number',
      min: 1,
      max: 4,
      admin: {
        description:
          'Current pre-upload question (1–4). Updated by Art/Official as the dialogue advances.',
      },
    },
    { name: 'firstImpression', type: 'textarea' },
    { name: 'secondDescription', type: 'textarea' },
    {
      name: 'highlightedMediaSlot',
      type: 'text',
      admin: {
        description:
          'Art/Official: slot id highlighted in the Media uploads panel (set by the agent).',
      },
    },
    {
      name: 'stagedMedia',
      type: 'json',
      admin: {
        description:
          'Art/Official staged media attachments (images, videos, URLs) before commit.',
      },
    },
    {
      name: 'fieldUpdateTimeline',
      type: 'json',
      admin: {
        description: 'Array of { field, value, confidence, source, timestamp }.',
      },
    },
    { name: 'agentDraftDescriptionShort', type: 'text' },
    { name: 'agentDraftDescriptionLong', type: 'textarea' },
    {
      name: 'agentDraftConceptualKeywords',
      type: 'array',
      labels: { singular: 'Keyword', plural: 'Agent draft keywords' },
      fields: [{ name: 'keyword', type: 'text', required: true }],
    },
    { name: 'agentDraftFormalContributionAssessment', type: 'textarea' },
    { name: 'sessionNotes', type: 'textarea' },
    {
      name: 'weakPhases',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Pre-upload', value: 'pre-upload' },
        { label: 'Identity', value: 'identity' },
        { label: 'Intent', value: 'intent' },
        { label: 'Art historical', value: 'art-historical' },
        { label: 'Classification', value: 'classification' },
        { label: 'Confirmation', value: 'confirmation' },
      ],
    },
    { name: 'blindDescriptionUseful', type: 'checkbox' },
    {
      name: 'formalContributionAccuracy',
      type: 'select',
      options: [
        { label: 'Accurate', value: 'accurate' },
        { label: 'Partial', value: 'partial' },
        { label: 'Missed', value: 'missed' },
      ],
    },
    {
      name: 'dialogueRefinementFlag',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Flag for follow-up refinement pass.',
      },
    },
    { name: 'refinementNotes', type: 'textarea' },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation }) => {
        if (operation === 'create' && !data.sessionId) {
          data.sessionId = randomUUID()
        }
        return data
      },
    ],
  },
}
