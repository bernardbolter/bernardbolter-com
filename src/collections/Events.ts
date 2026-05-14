import type { CollectionConfig } from 'payload'

import { privateFieldAccess, isArtistOrAdmin } from '@/access/isArtistOrAdmin'
import { eventBeforeChange } from '@/hooks/eventBeforeChange'
import { isPublished } from '@/utilities/accessControl'

const eventTypeOptions = [
  { label: 'Solo Exhibition', value: 'solo-exhibition' },
  { label: 'Group Exhibition', value: 'group-exhibition' },
  { label: 'Art Fair', value: 'art-fair' },
  { label: 'Residency', value: 'residency' },
  { label: 'Award', value: 'award' },
  { label: 'Publication', value: 'publication' },
  { label: 'Bibliography', value: 'bibliography' },
  { label: 'Public Commission', value: 'public-commission' },
  { label: 'Talk / Panel', value: 'talk-panel' },
  { label: 'Screening', value: 'screening' },
  { label: 'Performance', value: 'performance' },
  { label: 'Education', value: 'education' },
  { label: 'Other', value: 'other' },
] as const

const cvSectionOptions = [
  { label: 'Education', value: 'education' },
  { label: 'Solo Exhibitions', value: 'solo-exhibitions' },
  { label: 'Group Exhibitions', value: 'group-exhibitions' },
  { label: 'Art Fairs', value: 'art-fairs' },
  { label: 'Awards & Prizes', value: 'awards-prizes' },
  { label: 'Residencies', value: 'residencies' },
  { label: 'Public Commissions', value: 'public-commissions' },
  { label: 'Publications', value: 'publications' },
  { label: 'Bibliography', value: 'bibliography' },
  { label: 'Talks & Panels', value: 'talks-panels' },
  { label: 'Screenings', value: 'screenings' },
  { label: 'Performances', value: 'performances' },
  { label: 'Other', value: 'other' },
] as const

export const Events: CollectionConfig = {
  slug: 'events',
  hooks: {
    beforeChange: [eventBeforeChange],
  },
  access: {
    read: isPublished,
    create: ({ req: { user } }) => isArtistOrAdmin(user),
    update: ({ req: { user } }) => isArtistOrAdmin(user),
    delete: ({ req: { user } }) => isArtistOrAdmin(user),
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'eventType', 'startDate', 'status'],
    description: 'All professional events in the artist CV and exhibition history.',
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Identity',
          fields: [
            { name: 'title', type: 'text', required: true, localized: true },
            { name: 'slug', type: 'text', required: true, unique: true, index: true },
            {
              name: 'eventId',
              type: 'text',
              unique: true,
              index: true,
              admin: { readOnly: true, position: 'sidebar', description: 'Stable UUID for integrations.' },
            },
            { name: 'eventType', type: 'select', required: true, options: [...eventTypeOptions] },
            {
              name: 'eventTypeCustom',
              type: 'text',
              admin: { condition: (_, sibling) => sibling?.eventType === 'other' },
            },
            {
              name: 'status',
              type: 'select',
              required: true,
              defaultValue: 'draft',
              options: [
                { label: 'Draft', value: 'draft' },
                { label: 'Published', value: 'published' },
              ],
              admin: { position: 'sidebar' },
            },
            { name: 'featured', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar' } },
          ],
        },
        {
          label: 'Dates',
          fields: [
            { name: 'startDate', type: 'date', required: true },
            { name: 'endDate', type: 'date' },
            { name: 'isOngoing', type: 'checkbox', defaultValue: false },
            { name: 'openingDate', type: 'date' },
            {
              name: 'yearStart',
              type: 'number',
              admin: { readOnly: true, description: 'Computed from startDate.' },
            },
          ],
        },
        {
          label: 'Venue & Location',
          fields: [
            { name: 'venueName', type: 'text' },
            { name: 'venueCity', type: 'text' },
            { name: 'venueCountry', type: 'text' },
            { name: 'venueTgnUri', type: 'text' },
            { name: 'venueUrl', type: 'text' },
            { name: 'venueWikidataUri', type: 'text' },
            { name: 'isOnline', type: 'checkbox', defaultValue: false },
            {
              name: 'onlineEventUrl',
              type: 'text',
              admin: { condition: (_, sibling) => Boolean(sibling?.isOnline) },
            },
            {
              name: 'additionalVenues',
              type: 'array',
              fields: [
                { name: 'venueName', type: 'text' },
                { name: 'venueCity', type: 'text' },
                { name: 'venueCountry', type: 'text' },
                { name: 'startDate', type: 'date' },
                { name: 'endDate', type: 'date' },
                { name: 'venueUrl', type: 'text' },
              ],
            },
          ],
        },
        {
          label: 'Artworks',
          admin: {
            description:
              'Step 10: assign works here. Each artwork’s Classification tab shows this event via a reverse join (do not duplicate on the artwork).',
          },
          fields: [
            {
              name: 'artworks',
              type: 'relationship',
              relationTo: 'artworks',
              hasMany: true,
              admin: {
                description:
                  'Authority field for artwork ↔ event. Appears on Artwork → Classification → Events as a read-only join.',
              },
            },
            {
              name: 'artworkPresentationNote',
              type: 'text',
              admin: {
                description: 'How this work was presented in this event (optional).',
              },
            },
          ],
        },
        {
          label: 'Context',
          fields: [
            { name: 'organiser', type: 'text' },
            { name: 'curator', type: 'text' },
            {
              name: 'role',
              type: 'select',
              options: [
                { label: 'Solo', value: 'solo' },
                { label: 'Group', value: 'group' },
                { label: 'Duo', value: 'duo' },
                { label: 'Invited Artist', value: 'invited-artist' },
                { label: 'Artist in Residence', value: 'artist-in-residence' },
                { label: 'Awardee', value: 'awardee' },
                { label: 'Speaker', value: 'speaker' },
                { label: 'Panellist', value: 'panellist' },
                { label: 'Screened Artist', value: 'screened-artist' },
                { label: 'Commissioned Artist', value: 'commissioned-artist' },
              ],
            },
            {
              name: 'coExhibitors',
              type: 'array',
              fields: [{ name: 'name', type: 'text' }],
            },
            { name: 'catalogue', type: 'checkbox', defaultValue: false },
            { name: 'catalogueUrl', type: 'text' },
            { name: 'pressUrl', type: 'text' },
            { name: 'recordingUrl', type: 'text' },
          ],
        },
        {
          label: 'Description',
          fields: [
            { name: 'descriptionShort', type: 'text', localized: true },
            { name: 'descriptionLong', type: 'richText', localized: true },
            { name: 'artistNote', type: 'textarea', localized: true },
            { name: 'pressQuote', type: 'text', localized: true },
          ],
        },
        {
          label: 'Type-specific',
          fields: [
            {
              name: 'publicationTitle',
              type: 'text',
              admin: {
                condition: (_, sibling) =>
                  sibling?.eventType === 'publication' || sibling?.eventType === 'bibliography',
              },
            },
            {
              name: 'publicationAuthor',
              type: 'text',
              admin: { condition: (_, sibling) => sibling?.eventType === 'publication' },
            },
            {
              name: 'bibliographyAuthor',
              type: 'text',
              admin: { condition: (_, sibling) => sibling?.eventType === 'bibliography' },
            },
            {
              name: 'publicationIssn',
              type: 'text',
              admin: { condition: (_, sibling) => sibling?.eventType === 'publication' },
            },
            {
              name: 'publicationIsbn',
              type: 'text',
              admin: { condition: (_, sibling) => sibling?.eventType === 'publication' },
            },
            {
              name: 'publicationPages',
              type: 'text',
              admin: {
                condition: (_, sibling) =>
                  sibling?.eventType === 'publication' || sibling?.eventType === 'bibliography',
              },
            },
            {
              name: 'publicationUrl',
              type: 'text',
              admin: { condition: (_, sibling) => sibling?.eventType === 'bibliography' },
            },
            {
              name: 'awardGrantingOrganisation',
              type: 'text',
              admin: { condition: (_, sibling) => sibling?.eventType === 'award' },
            },
            {
              name: 'awardAmount',
              type: 'number',
              access: privateFieldAccess,
              admin: { condition: (_, sibling) => sibling?.eventType === 'award' },
            },
            {
              name: 'awardAmountCurrency',
              type: 'select',
              access: privateFieldAccess,
              options: [
                { label: 'EUR', value: 'EUR' },
                { label: 'USD', value: 'USD' },
                { label: 'GBP', value: 'GBP' },
                { label: 'CHF', value: 'CHF' },
                { label: 'Other', value: 'other' },
              ],
              admin: { condition: (_, sibling) => sibling?.eventType === 'award' },
            },
            {
              name: 'awardOutcome',
              type: 'select',
              options: [
                { label: 'Winner', value: 'winner' },
                { label: 'Shortlisted', value: 'shortlisted' },
                { label: 'Nominated', value: 'nominated' },
                { label: 'Honourable Mention', value: 'honourable-mention' },
              ],
              admin: { condition: (_, sibling) => sibling?.eventType === 'award' },
            },
            {
              name: 'residencyOrganisation',
              type: 'text',
              admin: { condition: (_, sibling) => sibling?.eventType === 'residency' },
            },
            {
              name: 'residencyType',
              type: 'select',
              options: [
                { label: 'Studio', value: 'studio' },
                { label: 'Live-work', value: 'live-work' },
                { label: 'Research', value: 'research' },
                { label: 'Production', value: 'production' },
                { label: 'International', value: 'international' },
              ],
              admin: { condition: (_, sibling) => sibling?.eventType === 'residency' },
            },
            {
              name: 'residencyWorksProduced',
              type: 'text',
              admin: { condition: (_, sibling) => sibling?.eventType === 'residency' },
            },
            {
              name: 'institution',
              type: 'text',
              admin: { condition: (_, sibling) => sibling?.eventType === 'education' },
            },
            {
              name: 'degree',
              type: 'text',
              admin: { condition: (_, sibling) => sibling?.eventType === 'education' },
            },
            {
              name: 'subject',
              type: 'text',
              admin: { condition: (_, sibling) => sibling?.eventType === 'education' },
            },
            {
              name: 'cvVisible',
              type: 'checkbox',
              defaultValue: true,
              admin: {
                condition: (_, sibling) => sibling?.eventType === 'education',
                description: 'Include on public CV.',
              },
            },
            {
              name: 'commissionClient',
              type: 'text',
              admin: { condition: (_, sibling) => sibling?.eventType === 'public-commission' },
            },
            {
              name: 'commissionSite',
              type: 'text',
              admin: { condition: (_, sibling) => sibling?.eventType === 'public-commission' },
            },
            {
              name: 'commissionBudget',
              type: 'number',
              access: privateFieldAccess,
              admin: { condition: (_, sibling) => sibling?.eventType === 'public-commission' },
            },
          ],
        },
        {
          label: 'CV',
          fields: [
            {
              name: 'cvSection',
              type: 'select',
              options: cvSectionOptions.map((o) => ({ label: o.label, value: o.value })),
            },
            { name: 'cvDisplayTitle', type: 'text', localized: true },
            { name: 'cvPriority', type: 'number', defaultValue: 5 },
            { name: 'excludeFromCv', type: 'checkbox', defaultValue: false },
          ],
        },
        {
          label: 'JSON-LD',
          fields: [
            { name: 'jsonldSameAs', type: 'array', fields: [{ name: 'uri', type: 'text' }] },
            {
              name: 'jsonldPreview',
              type: 'json',
              admin: { readOnly: true, description: 'Computed event JSON-LD preview.' },
            },
          ],
        },
      ],
    },
  ],
}
