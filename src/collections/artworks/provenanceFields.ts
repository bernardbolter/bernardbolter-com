import type { Field } from 'payload'

import { privateFieldAccess } from '@/access/isArtistOrAdmin'
import { PROVENANCE_CONFIDENCE_LEVELS } from '@/lib/artwork/provenanceConfidence'

const saleCurrencyOptions = [
  { label: 'EUR', value: 'EUR' },
  { label: 'USD', value: 'USD' },
  { label: 'GBP', value: 'GBP' },
  { label: 'CHF', value: 'CHF' },
  { label: 'Other', value: 'other' },
] as const

/**
 * Linked Art-style ownership events (typed array, staff-only).
 * A sale is recorded on the same event that transfers title — not a second JSON blob.
 */
export const ownershipHistoryField: Field = {
  name: 'ownershipHistory',
  type: 'array',
  access: privateFieldAccess,
  labels: { singular: 'Ownership event', plural: 'Ownership history' },
  admin: {
    description:
      'Sequence of acquisition / transfer / consignment events (Linked Art-style). Optional sale group on the same row is the financial act of that transfer — not a separate salesRecord id.',
  },
  fields: [
    {
      name: 'eventType',
      type: 'select',
      required: true,
      defaultValue: 'acquisition',
      options: [
        { label: 'Acquisition', value: 'acquisition' },
        { label: 'Transfer', value: 'transfer' },
        { label: 'Consignment', value: 'consignment' },
      ],
    },
    {
      name: 'actor',
      type: 'relationship',
      relationTo: 'people',
      admin: {
        description:
          'Known owner as a People record. Leave empty and use ownerPrivate / displayName when the holder is undisclosed.',
      },
    },
    {
      name: 'ownerPrivate',
      type: 'text',
      admin: { description: 'Internal owner name — never public.' },
    },
    {
      name: 'displayName',
      type: 'text',
      defaultValue: 'Private collection',
      admin: { description: 'Public label when collectorVisible is true. Defaults to Private collection.' },
    },
    {
      name: 'collectorVisible',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'dateAcquired',
      type: 'text',
      admin: { description: 'Freeform when exact ISO dates are unknown (e.g. 2022, c. 2012).' },
    },
    {
      name: 'dateRelinquished',
      type: 'text',
    },
    {
      name: 'place',
      type: 'group',
      admin: { description: 'Where the transfer took place (city/country — no Venue collection yet).' },
      fields: [
        { name: 'city', type: 'text' },
        { name: 'country', type: 'text' },
      ],
    },
    {
      name: 'claimStatus',
      type: 'select',
      defaultValue: 'unclaimed',
      options: [
        { label: 'Unclaimed', value: 'unclaimed' },
        { label: 'Claim pending', value: 'claimed-pending' },
        { label: 'Claim confirmed', value: 'claimed-confirmed' },
      ],
    },
    {
      name: 'notes',
      type: 'textarea',
      admin: { description: 'Staff-only notes on this event.' },
    },
    {
      name: 'sale',
      type: 'group',
      admin: {
        description:
          'If this event was a sale, record price here. This is the ownership-changing act — do not invent a transactionId linking a separate sales log.',
      },
      fields: [
        { name: 'saleDate', type: 'date' },
        { name: 'salePrice', type: 'number' },
        {
          name: 'saleCurrency',
          type: 'select',
          defaultValue: 'EUR',
          options: [...saleCurrencyOptions],
        },
        { name: 'exchangeRateToEur', type: 'number' },
        { name: 'buyerPrivate', type: 'text' },
        { name: 'buyerCity', type: 'text' },
        { name: 'channel', type: 'text' },
        { name: 'galleryName', type: 'text' },
        { name: 'auctionHouse', type: 'text' },
        { name: 'invoiceReference', type: 'text' },
        { name: 'commissionRate', type: 'number' },
        { name: 'netToArtist', type: 'number' },
        { name: 'vatApplicable', type: 'checkbox', defaultValue: false },
        { name: 'vatRate', type: 'number' },
        { name: 'editionNumber', type: 'text' },
        { name: 'notes', type: 'textarea' },
      ],
    },
  ],
}

export const loanHistoryField: Field = {
  name: 'loanHistory',
  type: 'array',
  access: privateFieldAccess,
  labels: { singular: 'Loan', plural: 'Loan history' },
  admin: {
    description: 'Institutional loans. Link the related Event when the showing is catalogued.',
  },
  fields: [
    {
      name: 'institution',
      type: 'text',
      required: true,
    },
    { name: 'dateOut', type: 'date' },
    { name: 'dateReturned', type: 'date' },
    {
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
      admin: { description: 'Optional Event this loan was for (exhibition, screening, etc.).' },
    },
    { name: 'notes', type: 'textarea' },
  ],
}

export const provenanceConfidenceLayerField: Field = {
  name: 'provenanceConfidenceLayer',
  type: 'array',
  access: privateFieldAccess,
  labels: { singular: 'Claim', plural: 'Provenance confidence' },
  admin: {
    description:
      'art-official extension: evidence-weighted claims. Attach to an ownership-history row via relatedOwnershipId when the claim is about a specific event in the chain.',
  },
  fields: [
    {
      name: 'claim',
      type: 'textarea',
      required: true,
    },
    {
      name: 'evidenceBasis',
      type: 'textarea',
    },
    {
      name: 'confidenceLevel',
      type: 'select',
      required: true,
      options: [
        { label: 'Documented fact', value: 'documented-fact' },
        { label: 'Credible inference', value: 'credible-inference' },
        { label: 'Institutional assertion', value: 'institutional-assertion' },
        { label: 'Speculation', value: 'speculation' },
      ],
    },
    {
      name: 'relatedOwnershipId',
      type: 'text',
      admin: {
        description:
          'Optional: id of the ownershipHistory row this claim describes. Leave empty for work-level claims (e.g. origin undocumented).',
      },
    },
  ],
}

export const provenanceConfidenceLevels = PROVENANCE_CONFIDENCE_LEVELS
