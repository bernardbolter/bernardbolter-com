import type { CollectionConfig } from 'payload'

import { authenticatedReadStaffWrite } from '@/access/staffAccess'

export const FieldNotes: CollectionConfig = {
  slug: 'field-notes',
  labels: { singular: 'Field note', plural: 'Field notes' },
  admin: {
    useAsTitle: 'locationName',
    defaultColumns: ['mediaType', 'capturedAt', 'city', 'processingStatus', 'updatedAt'],
    description: 'Unified capture records for text, photos, video clips, and voice memos.',
  },
  access: authenticatedReadStaffWrite,
  fields: [
    {
      name: 'mediaType',
      type: 'select',
      required: true,
      options: [
        { label: 'Text', value: 'text' },
        { label: 'Photo', value: 'photo' },
        { label: 'Video — B-roll', value: 'video-broll' },
        { label: 'Video — Observation', value: 'video-observation' },
        { label: 'Video — Performance', value: 'video-performance' },
        { label: 'Video — Process', value: 'video-process' },
        { label: 'Voice memo', value: 'voice-memo' },
      ],
    },
    {
      name: 'capturedAt',
      type: 'date',
      defaultValue: () => new Date().toISOString(),
    },
    {
      name: 'city',
      type: 'text',
    },
    {
      name: 'location',
      type: 'group',
      fields: [
        { name: 'lat', type: 'number' },
        { name: 'lng', type: 'number' },
      ],
    },
    {
      name: 'locationName',
      type: 'text',
    },
    {
      name: 'mediaFile',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'writtenNote',
      type: 'textarea',
    },
    {
      name: 'relatedArtwork',
      type: 'relationship',
      relationTo: 'artworks',
    },
    {
      name: 'relatedEpisode',
      type: 'relationship',
      relationTo: 'episodes' as never,
    },
    {
      name: 'capturePreset',
      type: 'relationship',
      relationTo: 'capture-presets',
      admin: {
        description: 'Shoot preset used at upload — drives pipeline steps and default field values.',
      },
    },
    {
      name: 'episode',
      type: 'text',
      admin: {
        description: 'Parsed from spoken slate, e.g. e01. Blank for non-episode clips.',
      },
    },
    {
      name: 'shotType',
      type: 'select',
      options: [
        { label: 'Hook', value: 'HOOK' },
        { label: 'Verse', value: 'VERSE' },
        { label: 'Arrive', value: 'ARRIVE' },
        { label: 'Detail', value: 'DETAIL' },
        { label: 'Wide', value: 'WIDE' },
        { label: 'Walk', value: 'WALK' },
        { label: 'Crowd', value: 'CROWD' },
        { label: 'Talk', value: 'TALK' },
        { label: 'Ambient', value: 'AMBIENT' },
        { label: 'BTS', value: 'BTS' },
      ],
      admin: {
        description: 'Parsed from spoken slate — closed vocabulary.',
      },
    },
    {
      name: 'take',
      type: 'number',
      admin: {
        description: 'Parsed from slate ("take two" → 2). Blank if not stated.',
      },
    },
    {
      name: 'verdict',
      type: 'select',
      options: [
        { label: 'Keeper', value: 'keeper' },
        { label: 'Scrap', value: 'scrap' },
        { label: 'Maybe', value: 'maybe' },
      ],
      admin: {
        description: 'Parsed from clip tail. Blank if not yet spoken.',
      },
    },
    {
      name: 'slateParseStatus',
      type: 'select',
      options: [
        { label: 'Parsed', value: 'parsed' },
        { label: 'Not found', value: 'not-found' },
        { label: 'Partial', value: 'partial' },
      ],
      admin: {
        description: 'Slate parser result — filter not-found for manual cleanup.',
      },
    },
    {
      name: 'processingStatus',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Queued', value: 'queued' },
        { label: 'Pending', value: 'pending' },
        { label: 'Processing', value: 'processing' },
        { label: 'Complete', value: 'complete' },
        { label: 'Failed', value: 'failed' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'register',
      type: 'select',
      options: [
        { label: 'Exploratory', value: 'exploratory' },
        { label: 'Resolved', value: 'resolved' },
        { label: 'Frustrated', value: 'frustrated' },
        { label: 'Excited', value: 'excited' },
        { label: 'Observational', value: 'observational' },
      ],
    },
    {
      name: 'processStage',
      type: 'select',
      options: [
        { label: 'Early', value: 'early' },
        { label: 'Mid', value: 'mid' },
        { label: 'Late', value: 'late' },
        { label: 'Completed', value: 'completed' },
      ],
    },
    {
      name: 'conceptualThread',
      type: 'select',
      options: [
        { label: 'Daguerreotype', value: 'daguerreotype' },
        { label: 'Wet plate', value: 'wet-plate' },
        { label: 'Aerial', value: 'aerial' },
        { label: 'Digital', value: 'digital' },
        { label: 'Layering', value: 'layering' },
        { label: 'Light quality', value: 'light-quality' },
        { label: 'Historical angle', value: 'historical-angle' },
      ],
    },
    {
      name: 'lines',
      type: 'relationship',
      relationTo: 'lines',
      hasMany: true,
    },
    {
      name: 'suggestedLines',
      type: 'array',
      admin: {
        readOnly: true,
        description:
          'Candidate Line connections from embedding jobs — confirm or dismiss in the studio Notes detail view.',
      },
      fields: [
        { name: 'lineId', type: 'number', required: true },
        { name: 'lineName', type: 'text' },
        { name: 'score', type: 'number' },
      ],
    },
    {
      name: 'audioTranscript',
      type: 'textarea',
      access: {
        update: () => false,
      },
    },
    {
      name: 'transcriptType',
      type: 'select',
      options: [
        { label: 'Shooter description', value: 'shooter-description' },
        { label: 'Speech', value: 'speech' },
        { label: 'None', value: 'none' },
      ],
      access: {
        update: () => false,
      },
    },
    {
      name: 'keyframes',
      type: 'array',
      access: {
        update: () => false,
      },
      fields: [
        { name: 'timestamp', type: 'number', required: true },
        { name: 'imageUrl', type: 'text', required: true },
        {
          name: 'tags',
          type: 'array',
          fields: [{ name: 'tag', type: 'text', required: true }],
        },
      ],
    },
    {
      name: 'detectedLanguage',
      type: 'text',
      access: {
        update: () => false,
      },
    },
    {
      name: 'duration',
      type: 'number',
      access: {
        update: () => false,
      },
    },
    {
      name: 'transcriptEmbedding',
      type: 'json',
      access: {
        update: () => false,
      },
      admin: {
        description: 'JSON number array until vector columns are introduced.',
      },
    },
    {
      name: 'recordOrigin',
      type: 'select',
      required: true,
      defaultValue: 'user',
      options: [
        { label: 'User', value: 'user' },
        { label: 'Pipeline', value: 'pipeline' },
        { label: 'Small model', value: 'small-model' },
      ],
      admin: { position: 'sidebar' },
    },
  ],
  timestamps: true,
}
