import type { Tab } from 'payload'

export const fieldNotesTab: Tab = {
  label: 'Field notes',
  fields: [
    {
      name: 'processPhotos',
      type: 'join',
      collection: 'field-notes',
      on: 'relatedArtwork',
      admin: {
        description:
          'Field notes linked to this artwork — process photos, clips, voice memos, and written notes.',
      },
    },
    {
      name: 'lines',
      type: 'relationship',
      relationTo: 'lines',
      hasMany: true,
      admin: {
        description: 'Active Lines this artwork contributes to.',
      },
    },
  ],
}
