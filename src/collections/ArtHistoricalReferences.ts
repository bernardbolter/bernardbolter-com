import type { CollectionConfig } from 'payload'

export const ArtHistoricalReferences: CollectionConfig = {
  slug: 'art-historical-references',
  admin: {
    useAsTitle: 'artworkTitle',
    defaultColumns: ['artworkTitle', 'artistName', 'yearCreated', 'updatedAt'],
    description: "Referenced artworks and artists in dialogue with Bernard's practice.",
  },
  fields: [
    {
      name: 'artworkTitle',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'artistName',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'yearCreated',
      type: 'number',
    },
    {
      name: 'medium',
      type: 'text',
    },
    {
      name: 'institution',
      type: 'text',
    },
    {
      name: 'imageUrl',
      type: 'text',
      admin: {
        description: 'Reference-only image URL (not publicly rendered).',
      },
    },
    {
      name: 'referenceUrl',
      type: 'text',
      admin: {
        description: 'Authoritative source URL (museum record, Wikidata, etc.).',
      },
    },
    {
      name: 'wikidataUri',
      type: 'text',
      admin: {
        description: 'Optional Wikidata URI for the referenced work.',
      },
    },
    {
      name: 'notes',
      type: 'text',
    },
  ],
}
