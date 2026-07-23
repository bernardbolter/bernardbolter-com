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
        { label: 'Connected reading', value: 'connected-reading' },
        { label: 'Artist statement', value: 'artist-statement' },
        { label: 'Biography', value: 'biography' },
        { label: 'Onboarding', value: 'onboarding' },
        { label: 'Annual snapshot', value: 'annual-snapshot' },
        { label: 'Sequencing', value: 'sequencing' },
        { label: 'Episode storyboard', value: 'episode-storyboard' },
        { label: 'Episode assembly', value: 'episode-assembly' },
        { label: 'Event enrichment', value: 'event-enrichment' },
        { label: 'Corpus revisit', value: 'corpus-revisit' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'revisitOf',
      type: 'relationship',
      relationTo: 'sessions',
      admin: {
        position: 'sidebar',
        description:
          'Set only when sessionType is corpus-revisit. Points to the original session being reopened in light of new corpus context.',
        condition: (data) => data?.sessionType === 'corpus-revisit',
      },
    },
    {
      name: 'linchpinFlag',
      type: 'group',
      admin: {
        description:
          'Set when a session is doing double duty — cataloguing one artwork while surfacing a structural pattern across the corpus. Signals the dialogue agent to pace more slowly and not default to wrap-up once standard fields are checked off.',
      },
      fields: [
        {
          name: 'isLinchpin',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'note',
          type: 'textarea',
          admin: {
            description: 'What corpus-level pattern this session surfaced, briefly.',
            condition: (_, siblingData) => siblingData?.isLinchpin === true,
          },
        },
      ],
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
      name: 'primaryArtwork',
      type: 'relationship',
      relationTo: 'artworks',
      admin: {
        position: 'sidebar',
        description:
          'The single artwork this session was cataloguing, if any. Empty for biography/statement-only sessions. Kept in sync with artworkRecord.',
      },
    },
    {
      name: 'mentionedArtworks',
      type: 'relationship',
      relationTo: 'artworks',
      hasMany: true,
      admin: {
        position: 'sidebar',
        description:
          'Every other artwork referenced during the session — comparisons, corpus connections, related works. Queryable independently from primaryArtwork.',
      },
    },
    {
      name: 'artworkRecord',
      type: 'relationship',
      relationTo: 'artworks',
      admin: {
        position: 'sidebar',
        description:
          'Legacy alias for primaryArtwork. Prefer primaryArtwork for new code; both stay in sync.',
      },
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
      name: 'episodeRecord',
      type: 'relationship',
      relationTo: 'episodes' as never,
      admin: {
        position: 'sidebar',
        description: 'MoP episode for storyboard or assembly sessions.',
      },
    },
    {
      name: 'eventRecord',
      type: 'relationship',
      relationTo: 'events',
      admin: {
        position: 'sidebar',
        description: 'Event stub being enriched in an event-enrichment session.',
      },
    },
    {
      name: 'eventDialoguePhase',
      type: 'select',
      defaultValue: 'phase-a-research',
      options: [
        { label: 'Phase A — Research (Haiku)', value: 'phase-a-research' },
        { label: 'Phase B — Reasoning (Sonnet)', value: 'phase-b-reasoning' },
      ],
      admin: {
        position: 'sidebar',
        readOnly: true,
        condition: (data) => data.sessionType === 'event-enrichment',
        description:
          'Two-phase event dialogue. Phase A: authority lookup. Phase B: reflective questions.',
      },
    },
    {
      name: 'eventAuthorityProposals',
      type: 'json',
      admin: {
        description:
          'Pending Phase A authority URI proposals awaiting artist confirmation.',
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
      name: 'currentPhase',
      type: 'select',
      options: [
        { label: 'Pre-upload', value: 'pre-upload' },
        { label: 'First sight', value: 'vision' },
        { label: 'Identity', value: 'identity' },
        { label: 'Physical', value: 'physical' },
        { label: 'Classification', value: 'classification' },
        { label: 'Intent', value: 'intent' },
        { label: 'Art historical', value: 'art-historical' },
        { label: 'Late', value: 'late' },
        { label: 'Confirmation', value: 'confirmation' },
      ],
      admin: {
        position: 'sidebar',
        description:
          'Art/Official dialogue phase (model tiering). Updated by set_phase or manual advance.',
      },
    },
    {
      name: 'tokenLog',
      type: 'json',
      admin: {
        description:
          'Per-turn Anthropic usage (input/output/cache). Staff-only; not exposed on public APIs.',
      },
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
      name: 'proposedAbstracts',
      type: 'array',
      labels: { singular: 'Proposed abstract', plural: 'Proposed abstracts' },
      admin: {
        description:
          'Abstracts proposed during the session-close abstract-proposal beat, before they are written to the Artist singleton.',
      },
      fields: [
        {
          name: 'targetCollection',
          type: 'select',
          required: true,
          options: [
            { label: 'Bio timeline', value: 'bio-timeline' },
            { label: 'Statement throughline', value: 'statement-throughline' },
          ],
        },
        { name: 'text', type: 'textarea', required: true },
        {
          name: 'status',
          type: 'select',
          defaultValue: 'proposed',
          options: [
            { label: 'Proposed', value: 'proposed' },
            { label: 'Accepted', value: 'accepted' },
            { label: 'Edited', value: 'edited' },
            { label: 'Rejected', value: 'rejected' },
          ],
        },
        {
          name: 'eventDate',
          type: 'text',
          admin: {
            description: 'Bio-timeline only: when the life-event happened (e.g. "1993").',
            condition: (_, siblingData) => siblingData?.targetCollection === 'bio-timeline',
          },
        },
        {
          name: 'dateRecognized',
          type: 'date',
          admin: {
            description: 'Statement-throughline only: when the pattern was named.',
            condition: (_, siblingData) =>
              siblingData?.targetCollection === 'statement-throughline',
          },
        },
        {
          name: 'linkedArtworks',
          type: 'relationship',
          relationTo: 'artworks',
          hasMany: true,
        },
      ],
    },
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
      name: 'stagedEventMedia',
      type: 'json',
      admin: {
        description:
          'Event enrichment: linked artworks and installation photos pending commit.',
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
        { label: 'First sight', value: 'vision' },
        { label: 'Identity', value: 'identity' },
        { label: 'Physical', value: 'physical' },
        { label: 'Intent', value: 'intent' },
        { label: 'Art historical', value: 'art-historical' },
        { label: 'Classification', value: 'classification' },
        { label: 'Late', value: 'late' },
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
    {
      name: 'sequencingSeries',
      type: 'relationship',
      relationTo: 'series',
      admin: {
        description: 'For sequencing sessions — the series being ordered.',
      },
    },
    {
      name: 'legacyRecordId',
      type: 'number',
      admin: {
        description:
          'WordPress databaseId cross-checked during cataloguing (legacy lookup). Read-only reference.',
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation }) => {
        if (operation === 'create' && !data.sessionId) {
          data.sessionId = randomUUID()
        }
        // Keep primaryArtwork and legacy artworkRecord in sync.
        if (data.primaryArtwork != null && data.artworkRecord == null) {
          data.artworkRecord = data.primaryArtwork
        } else if (data.artworkRecord != null && data.primaryArtwork == null) {
          data.primaryArtwork = data.artworkRecord
        }
        return data
      },
    ],
  },
}
