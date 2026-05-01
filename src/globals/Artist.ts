import type { GlobalConfig } from 'payload'

export const Artist: GlobalConfig = {
  slug: 'artist',
  label: 'Artist',
  admin: {
    description:
      'Single canonical artist identity record used for JSON-LD creator/performer output.',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      defaultValue: 'Bernard Bolter',
    },
    {
      name: 'ulanUri',
      type: 'text',
      admin: {
        description: 'Getty ULAN URI, e.g. http://vocab.getty.edu/ulan/500xxxxxx',
      },
    },
    {
      name: 'wikidataUri',
      type: 'text',
      admin: {
        description: 'Wikidata entity URI, e.g. https://www.wikidata.org/entity/Qxxxxxx',
      },
    },
    {
      name: 'bio',
      type: 'richText',
      localized: true,
    },
    {
      name: 'statement',
      type: 'richText',
      localized: true,
    },
  ],
}
