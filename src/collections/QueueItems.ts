import type { CollectionConfig } from 'payload'

import { authenticatedReadStaffWrite } from '@/access/staffAccess'

export const QueueItems: CollectionConfig = {
  slug: 'queue-items',
  labels: { singular: 'Queue item', plural: 'Queue items' },
  admin: {
    useAsTitle: 'captionText',
    defaultColumns: ['platform', 'contentType', 'status', 'campaign', 'suggestedTime'],
    description: 'Single-platform schedulable social posts.',
    group: 'Studio Social',
  },
  access: authenticatedReadStaffWrite,
  fields: [
    {
      name: 'campaign',
      type: 'relationship',
      relationTo: 'campaigns',
      required: true,
    },
    {
      name: 'theme',
      type: 'relationship',
      relationTo: 'themes',
    },
    {
      name: 'platform',
      type: 'select',
      required: true,
      options: [
        { label: 'Instagram', value: 'instagram' },
        { label: 'TikTok', value: 'tiktok' },
        { label: 'YouTube Shorts', value: 'youtube-shorts' },
        { label: 'YouTube Longform', value: 'youtube-longform' },
      ],
    },
    {
      name: 'contentType',
      type: 'select',
      required: true,
      options: [
        { label: 'Archive post', value: 'archive-post' },
        { label: 'Museum post', value: 'museum-post' },
        { label: 'Reel', value: 'reel' },
        { label: 'Story', value: 'story' },
        { label: 'Longform', value: 'longform' },
      ],
    },
    {
      name: 'linkedFieldNotes',
      type: 'relationship',
      relationTo: 'field-notes',
      hasMany: true,
    },
    {
      name: 'linkedArtworks',
      type: 'relationship',
      relationTo: 'artworks',
      hasMany: true,
    },
    { name: 'captionText', type: 'textarea' },
    {
      name: 'hashtags',
      type: 'relationship',
      relationTo: 'hashtag-tags',
      hasMany: true,
    },
    { name: 'suggestedTime', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'idea',
      options: [
        { label: 'Idea', value: 'idea' },
        { label: 'Drafted', value: 'drafted' },
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Posted', value: 'posted' },
        { label: 'Promoted', value: 'promoted' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'promotedFrom',
      type: 'relationship',
      relationTo: 'queue-items',
      admin: {
        description: 'Set when an Instagram item is promoted from a TikTok original.',
        position: 'sidebar',
      },
    },
    {
      name: 'metricsSnapshots',
      type: 'array',
      labels: { singular: 'Metrics snapshot', plural: 'Metrics snapshots' },
      fields: [
        { name: 'date', type: 'date', required: true },
        { name: 'views', type: 'number' },
        { name: 'likes', type: 'number' },
        { name: 'shares', type: 'number' },
        { name: 'comments', type: 'number' },
      ],
    },
    {
      name: 'connectsTo',
      type: 'relationship',
      relationTo: ['artworks', 'field-notes', 'queue-items'],
      hasMany: true,
      admin: {
        description: 'Optional flexible graph links across archive, notes, and queue items.',
      },
    },
  ],
}
