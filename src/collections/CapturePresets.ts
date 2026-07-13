import type { CollectionConfig } from 'payload'

import { authenticatedReadStaffWrite } from '@/access/staffAccess'
import { fieldNoteMediaTypes } from '@/lib/studio/fieldNoteSchema'

export const CapturePresets: CollectionConfig = {
  slug: 'capture-presets',
  labels: { singular: 'Capture preset', plural: 'Capture presets' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'mediaType', 'keyframeIntervalSec', 'updatedAt'],
    description:
      'Repeatable shoot configurations — drives upload defaults and overnight pipeline steps.',
  },
  access: authenticatedReadStaffWrite,
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'mediaType',
      type: 'select',
      required: true,
      options: fieldNoteMediaTypes.map((value) => ({
        label: value,
        value,
      })),
    },
    {
      name: 'pipelineSteps',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['keyframes', 'moondream', 'whisper', 'slateParse'],
      options: [
        { label: 'Keyframes', value: 'keyframes' },
        { label: 'Moondream', value: 'moondream' },
        { label: 'Whisper', value: 'whisper' },
        { label: 'Slate parse', value: 'slateParse' },
      ],
      admin: {
        description: 'Processing steps run by the overnight worker for clips using this preset.',
      },
    },
    {
      name: 'defaultEpisode',
      type: 'text',
      admin: {
        description: 'Optional pre-fill, e.g. e01. Leave blank for one-offs (b-roll, museum visits).',
      },
    },
    {
      name: 'defaultLocationName',
      type: 'text',
      admin: {
        description: 'Optional pre-fill for locationName on upload.',
      },
    },
    {
      name: 'transcriptLabel',
      type: 'select',
      required: true,
      defaultValue: 'speech',
      options: [
        { label: 'Shooter description', value: 'shooter-description' },
        { label: 'Speech', value: 'speech' },
        { label: 'None', value: 'none' },
      ],
    },
    {
      name: 'keyframeIntervalSec',
      type: 'number',
      required: true,
      defaultValue: 10,
      min: 1,
      admin: {
        description: 'Seconds between extracted keyframes (default 10).',
      },
    },
  ],
  timestamps: true,
}
