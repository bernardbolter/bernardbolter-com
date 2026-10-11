import type { CollectionConfig } from 'payload'

import { authenticatedReadStaffWrite } from '@/access/staffAccess'

/**
 * Durable public URL redirects for permanent addresses (sessions, throughlines, bio entries).
 * Middleware resolves fromPath → final toPath (multi-hop) with 308.
 */
export const Redirects: CollectionConfig = {
  slug: 'redirects',
  labels: { singular: 'Redirect', plural: 'Redirects' },
  admin: {
    useAsTitle: 'fromPath',
    defaultColumns: ['fromPath', 'toPath', 'source', 'updatedAt'],
    description:
      'Old public paths that must keep resolving. Auto-recorded when sessionId or entry slugs change; do not delete rows that appear in Arweave / cited URLs.',
  },
  access: authenticatedReadStaffWrite,
  fields: [
    {
      name: 'fromPath',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'Exact pathname that should redirect, e.g. /sessions/old-id',
      },
    },
    {
      name: 'toPath',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Current pathname target, e.g. /sessions/new-id',
      },
    },
    {
      name: 'source',
      type: 'select',
      required: true,
      options: [
        { label: 'Session', value: 'session' },
        { label: 'Throughline', value: 'throughline' },
        { label: 'Bio entry', value: 'bio-entry' },
        { label: 'Manual', value: 'manual' },
      ],
      defaultValue: 'manual',
    },
  ],
  timestamps: true,
}
