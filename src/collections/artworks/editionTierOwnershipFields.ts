import type { Field, Validate } from 'payload'

import { isArtistOrAdmin, privateFieldAccess } from '@/access/isArtistOrAdmin'

function hasSeriesTierKey(siblingData: Record<string, unknown> | undefined): boolean {
  const key = siblingData?.seriesTierKey
  return typeof key === 'string' && key.trim().length > 0
}

function hasFallbackTierIdentity(siblingData: Record<string, unknown> | undefined): boolean {
  const tierName = siblingData?.tierName
  const totalEditionSize = siblingData?.totalEditionSize
  return (
    tierName != null &&
    tierName !== '' &&
    totalEditionSize != null &&
    totalEditionSize !== ''
  )
}

function hasMegacitiesFallbackTierIdentity(siblingData: Record<string, unknown> | undefined): boolean {
  const tier = siblingData?.tier
  const editionSize = siblingData?.editionSize
  return tier != null && tier !== '' && editionSize != null
}

/** Each row must link a series tier or specify local fallback name + size. */
export const editionTierRowIdentityValidate: Validate<unknown[] | null | undefined> = (value) => {
  if (!Array.isArray(value)) return true

  for (let i = 0; i < value.length; i++) {
    const row = value[i]
    if (!row || typeof row !== 'object') continue
    const sibling = row as Record<string, unknown>
    if (hasSeriesTierKey(sibling) || hasFallbackTierIdentity(sibling)) continue
    return `Edition tier ${i + 1}: set seriesTierKey or provide tierName and totalEditionSize.`
  }

  return true
}

/** Fallback tierName is required only when seriesTierKey is unset. */
export const editionTierLocalNameValidate: Validate<string | null | undefined> = (
  value,
  { siblingData },
) => {
  if (hasSeriesTierKey(siblingData as Record<string, unknown> | undefined)) return true
  if (value == null || value === '') return 'Required when no series tier key is set'
  return true
}

/** Fallback totalEditionSize is required only when seriesTierKey is unset. */
export const editionTierLocalSizeValidate: Validate<number | null | undefined> = (
  value,
  { siblingData },
) => {
  if (hasSeriesTierKey(siblingData as Record<string, unknown> | undefined)) return true
  if (value == null) return 'Required when no series tier key is set'
  return true
}

/** Fallback Megacities tier select is required only when seriesTierKey is unset. */
export const editionTierMegacitiesTierValidate: Validate<string | null | undefined> = (
  value,
  { siblingData },
) => {
  if (hasSeriesTierKey(siblingData as Record<string, unknown> | undefined)) return true
  if (value == null || value === '') return 'Required when no series tier key is set'
  return true
}

/** Fallback Megacities editionSize is required only when seriesTierKey is unset. */
export const editionTierMegacitiesSizeValidate: Validate<number | null | undefined> = (
  value,
  { siblingData },
) => {
  if (hasSeriesTierKey(siblingData as Record<string, unknown> | undefined)) return true
  if (value == null) return 'Required when no series tier key is set'
  return true
}

/** Each Megacities print row must link a series tier or specify local tier + editionSize. */
export const editionTierMegacitiesRowIdentityValidate: Validate<unknown[] | null | undefined> = (
  value,
) => {
  if (!Array.isArray(value)) return true

  for (let i = 0; i < value.length; i++) {
    const row = value[i]
    if (!row || typeof row !== 'object') continue
    const sibling = row as Record<string, unknown>
    if (hasSeriesTierKey(sibling) || hasMegacitiesFallbackTierIdentity(sibling)) continue
    return `Edition ${i + 1}: set seriesTierKey or provide tier and editionSize.`
  }

  return true
}

export const editionTierSeriesKeyField: Field = {
  name: 'seriesTierKey',
  type: 'text',
  admin: {
    description:
      'Matches editionTiers[].tierKey on this artwork\'s series. Name, size, substrate, and shared Vendure Product are read from there.',
  },
}

export const editionTierVendureVariantIdField: Field = {
  name: 'vendureVariantId',
  type: 'text',
  access: privateFieldAccess,
  admin: {
    description:
      "This artwork's Variant within the shared Vendure Product (see the series tier's vendureProductId). Stock is tracked per-variant.",
  },
}

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

/** @deprecated Use editionTierSeriesKeyField */
export const editionTierSeriesRelationField = editionTierSeriesKeyField
