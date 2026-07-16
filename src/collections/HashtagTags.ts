import type { CollectionConfig } from 'payload'

import { authenticatedReadStaffWrite } from '@/access/staffAccess'

export const HashtagTags: CollectionConfig = {
  slug: 'hashtag-tags',
  labels: { singular: 'Hashtag', plural: 'Hashtags' },
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'updatedAt'],
    description: 'Reusable hashtag/tag labels for Queue Items.',
    group: 'Studio Social',
  },
  access: authenticatedReadStaffWrite,
  fields: [
    {
      name: 'label',
      type: 'text',
      required: true,
      unique: true,
      admin: { description: 'e.g. #berlinart' },
    },
  ],
}
