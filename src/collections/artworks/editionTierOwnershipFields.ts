import type { Field } from 'payload'

import { isArtistOrAdmin, privateFieldAccess } from '@/access/isArtistOrAdmin'

export const editionTierIsOriginalTierField: Field = {
  name: 'isOriginalTier',
  type: 'checkbox',
  defaultValue: false,
  admin: {
    description:
      'True only for the tier that IS the artwork itself — e.g. DCS/Megacities 3+1AP monumental. Renders in Status & Provenance, not in the Editions accordion.',
  },
}

export const editionTierCopiesField: Field = {
  name: 'copies',
  type: 'array',
  labels: { singular: 'Copy', plural: 'Ownership copies' },
  admin: {
    description:
      'Per-copy ownership claims for this tier. Claimed-count on the public page is always computed from here — never from editionsRemaining.',
  },
  fields: [
    { name: 'copyNumber', type: 'text', required: true },
    { name: 'isArtistProof', type: 'checkbox', defaultValue: false },
    {
      name: 'owner',
      type: 'text',
      access: {
        read: ({ siblingData, req: { user } }) =>
          siblingData?.collectorVisible === true || isArtistOrAdmin(user),
      },
    },
    {
      name: 'claimStatus',
      type: 'select',
      defaultValue: 'unclaimed',
      options: [
        { label: 'Unclaimed', value: 'unclaimed' },
        { label: 'Claim pending', value: 'claimed-pending' },
        { label: 'Claim confirmed', value: 'claimed-confirmed' },
        { label: 'Artist held', value: 'artist-held' },
        { label: 'Sold secondary', value: 'sold-secondary' },
      ],
    },
    { name: 'collectorVisible', type: 'checkbox', defaultValue: false },
    { name: 'dateAcquired', type: 'date' },
    { name: 'claimedCopyNumberKnown', type: 'checkbox', defaultValue: false },
    {
      name: 'notes',
      type: 'textarea',
      access: privateFieldAccess,
      admin: { description: 'Private — never rendered publicly.' },
    },
  ],
}
