import type { CollectionConfig, Where } from 'payload'

import { adminOnlyFieldAccess, privateFieldAccess, publicReadStaffWriteAccess, isArtistOrAdmin } from '@/access/isArtistOrAdmin'
import { artworkAchBeforeChange, artworkAchValidateAr } from '@/hooks/artworkAch'
import { artworkAfterChange } from '@/hooks/artworkAfterChange'
import { artworkAfterChangeAr } from '@/hooks/artworkAfterChangeAr'
import { artworkAfterChangeImageResize } from '@/hooks/artworkAfterChangeImageResize'
import { artworkAfterRead } from '@/hooks/artworkAfterRead'
import { artworkBeforeChange } from '@/hooks/artworkBeforeChange'
import { artworkSeriesEditionTiersBeforeChange } from '@/hooks/artworkSeriesEditionTiersBeforeChange'
import { validateArtworkMedium } from '@/lib/artOfficial/artworkMediumOptions'

import { artworkPrimaryMediaFields } from './artworks/artworkPrimaryMediaFields'
import { editionTierIsOriginalTierField } from './artworks/editionTierOwnershipFields'
import {
  editionTierDimensionFields,
  editionTierPrintTechniqueField,
  editionTierSubstrateField,
} from './artworks/editionTierSpecFields'
import { dcsTab } from './artworks/dcsTabFields'
import { fieldNotesTab } from './artworks/fieldNotesTab'
import { megacitiesTab } from './artworks/megacitiesTabFields'

const RESERVED_FRONTEND_SLUGS = new Set([
  '',
  'admin',
  'api',
  'artworks',
  'bio',
  'contact',
  'cv',
  'datenschutz',
  'events',
  'statement',
  'studio',
])

export const Artworks: CollectionConfig = {
  slug: 'artworks',
  access: {
    read: ({ req: { user } }) => {
      if (isArtistOrAdmin(user)) return true
      const where: Where = {
        and: [
          { status: { equals: 'published' } },
          { recordOrigin: { equals: 'artist-catalogued' } },
        ],
      }
      return where
    },
    create: ({ req: { user } }) => isArtistOrAdmin(user),
    update: ({ req: { user } }) => isArtistOrAdmin(user),
    delete: ({ req: { user } }) => isArtistOrAdmin(user),
  },
  hooks: {
    beforeValidate: [artworkAchValidateAr],
    beforeChange: [artworkBeforeChange, artworkSeriesEditionTiersBeforeChange, artworkAchBeforeChange],
    afterChange: [artworkAfterChange, artworkAfterChangeImageResize, artworkAfterChangeAr],
    afterRead: [artworkAfterRead],
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'series', 'yearCreated', 'isForSale'],
    description: 'The complete archive of all artworks.',
  },
  fields: [
    ...artworkPrimaryMediaFields,

    {
      type: 'tabs',
      tabs: [
        // ── TAB 1: Core ───────────────────────────────────────
        {
          label: 'Core',
          fields: [
            {
              name: 'title',
              type: 'text',
              required: true,
              localized: true,
            },
            {
              name: 'altTitle',
              type: 'text',
              localized: true,
              admin: {
                description: 'Alternate title — also known as (other language or market).',
              },
            },
            {
              name: 'catalogueNumber',
              type: 'text',
              unique: true,
              index: true,
              admin: {
                readOnly: true,
                description:
                  'Auto-assigned catalogue ID, e.g. BB-ACH-2019-003 (prefix · series code · year · sequence).',
              },
            },
            {
              name: 'catalogueSequence',
              type: 'number',
              admin: {
                readOnly: true,
                hidden: true,
                description: 'Sequence within series + year — used to build catalogueNumber.',
              },
            },
            {
              name: 'slug',
              type: 'text',
              required: true,
              unique: true,
              validate: (value: unknown) => {
                if (typeof value !== 'string') return 'Slug is required.'
                const normalized = value.trim().toLowerCase()
                if (!normalized) return 'Slug is required.'
                if (RESERVED_FRONTEND_SLUGS.has(normalized)) {
                  return `Slug "${normalized}" is reserved for a site route.`
                }
                return true
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'creator',
                  type: 'relationship',
                  relationTo: 'artists',
                  required: true,
                  admin: {
                    width: '50%',
                    description: 'Primary artist for this work.',
                  },
                },
                {
                  name: 'series',
                  type: 'relationship',
                  relationTo: 'series',
                  hasMany: false,
                  required: true,
                  admin: {
                    width: '50%',
                    description:
                      'Series drives conditional tabs (A Colorful History, Digital City Series, Megacities). Save after changing — Art/Official Megacities workflow applies when series slug is megacities.',
                  },
                },
              ],
            },
            {
              // auto-populated from series, drives tab visibility
              name: 'seriesSlug',
              type: 'text',
              admin: {
                readOnly: true,
                hidden: true,
                description: 'Auto-set from series — drives series-specific tabs.',
              },
              hooks: {
                beforeChange: [
                  async ({ siblingData, req }) => {
                    if (!siblingData?.series) return null
                    const seriesId =
                      typeof siblingData.series === 'object' && siblingData.series !== null
                        ? (siblingData.series as { id?: number }).id
                        : siblingData.series
                    if (seriesId == null || seriesId === '') return null
                    try {
                      const s = await req.payload.findByID({
                        collection: 'series',
                        id: seriesId,
                        depth: 0,
                      })
                      return s?.slug ?? null
                    } catch {
                      return null
                    }
                  },
                ],
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'status',
                  type: 'select',
                  required: true,
                  defaultValue: 'draft',
                  options: [
                    { label: 'Draft', value: 'draft' },
                    { label: 'Published', value: 'published' },
                    { label: 'Archived', value: 'archived' },
                  ],
                  admin: { width: '50%' },
                },
                {
                  name: 'reasoningStatus',
                  type: 'select',
                  defaultValue: 'complete',
                  options: [
                    { label: 'Stub — quick upload only', value: 'stub' },
                    { label: 'Partial — some sessions completed', value: 'partial' },
                    { label: 'Complete — full Art/Official session done', value: 'complete' },
                  ],
                  admin: {
                    width: '50%',
                    readOnly: true,
                    description:
                      'Tracks how deeply this artwork has been catalogued through Art/Official. Set by Quick Upload and session commit — not edited manually.',
                  },
                },
                {
                  name: 'recordOrigin',
                  type: 'select',
                  required: true,
                  defaultValue: 'artist-catalogued',
                  access: {
                    read: () => true,
                    update: () => false,
                  },
                  options: [
                    { label: 'Artist catalogued', value: 'artist-catalogued' },
                    { label: 'Gallery catalogued', value: 'gallery-catalogued' },
                    { label: 'Collector catalogued', value: 'collector-catalogued' },
                    { label: 'Migrated', value: 'migrated' },
                    { label: 'Enrichment agent', value: 'enrichment-agent' },
                  ],
                  admin: {
                    width: '50%',
                    description:
                      'Set once at creation; immutable. Provenance of the catalogue record.',
                  },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'yearCreated',
                  type: 'number',
                  required: true,
                  admin: {
                    width: '33%',
                    description: 'Four-digit year the work was begun.',
                  },
                },
                {
                  name: 'yearCompleted',
                  type: 'number',
                  admin: {
                    width: '33%',
                    description: 'Year finished if different from year created.',
                  },
                },
                {
                  name: 'yearStart',
                  type: 'number',
                  admin: {
                    width: '34%',
                    readOnly: true,
                    description: 'Mirrors year created — reserved for future slug generation.',
                  },
                },
              ],
            },
            {
              type: 'collapsible',
              label: 'Timeline & sequencing',
              admin: {
                initCollapsed: false,
                description:
                  'Order (sortIndex) drives the proportional timeline. timelineDate and dateDisplay are computed — run recompute after placement or anchor changes.',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'sortIndex',
                      type: 'number',
                      admin: {
                        width: '33%',
                        description: 'Authoritative display order (float — insert between works via midpoint).',
                      },
                    },
                    {
                      name: 'datePrecision',
                      type: 'select',
                      defaultValue: 'unknown',
                      options: [
                        { label: 'Exact', value: 'exact' },
                        { label: 'Month', value: 'month' },
                        { label: 'Year', value: 'year' },
                        { label: 'Circa', value: 'circa' },
                        { label: 'Decade', value: 'decade' },
                        { label: 'Unknown', value: 'unknown' },
                      ],
                      admin: { width: '33%' },
                    },
                    {
                      name: 'dateKnown',
                      type: 'date',
                      admin: {
                        width: '34%',
                        description: 'Concrete known date — anchor when precision is exact/month/year.',
                      },
                    },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'dateEarliest',
                      type: 'date',
                      admin: { width: '50%', description: 'Made no earlier than.' },
                    },
                    {
                      name: 'dateLatest',
                      type: 'date',
                      admin: { width: '50%', description: 'Made no later than.' },
                    },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'timelineDate',
                      type: 'date',
                      admin: {
                        width: '50%',
                        readOnly: true,
                        description: 'Computed positioning date — internal layout only, never public.',
                      },
                    },
                    {
                      name: 'dateDisplay',
                      type: 'text',
                      admin: {
                        width: '50%',
                        readOnly: true,
                        description: 'Honest human label for the timeline view.',
                      },
                    },
                  ],
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'datePublished',
                  type: 'date',
                  admin: { width: '50%' },
                },
                {
                  name: 'wp_id',
                  type: 'number',
                  admin: {
                    width: '50%',
                    description: 'Legacy WordPress ID.',
                  },
                },
              ],
            },
            {
              name: 'oldWpUrl',
              type: 'text',
              admin: {
                description: 'Legacy WordPress artwork URL.',
              },
            },
          ],
        },

        // ── TAB 2: Artwork ────────────────────────────────────
        {
          label: 'Artwork',
          fields: [
            {
              name: 'medium',
              type: 'text',
              required: true,
              index: true,
              validate: validateArtworkMedium,
              admin: {
                description:
                  'Medium slug (built-in or custom from Art/Official Quick Upload). Labels in Globals → Art/Official settings.',
                components: {
                  Field: '/components/admin/ArtworkMediumSelectField#ArtworkMediumSelectField',
                },
              },
            },
            {
              name: 'mediumOther',
              type: 'text',
              localized: true,
              admin: {
                description: 'Override or specify when medium is “Other”.',
                condition: (_, data) => data?.medium === 'other',
              },
            },
            {
              name: 'mediumAatUri',
              type: 'text',
              admin: {
                description:
                  'Getty AAT URI for this medium. Auto-filled from the medium registry when known; editable for overrides.',
              },
            },
            {
              name: 'measurementType',
              type: 'select',
              hasMany: true,
              required: true,
              defaultValue: ['physical'],
              options: [
                { label: 'Physical', value: 'physical' },
                { label: 'Digital', value: 'digital' },
                { label: 'Time-based', value: 'time-based' },
              ],
              admin: {
                description: 'Gates which dimension sections apply. A work can combine types.',
              },
            },
            {
              name: 'support',
              type: 'select',
              options: [
                { label: 'Canvas', value: 'canvas' },
                { label: 'Paper', value: 'paper' },
                { label: 'Board', value: 'board' },
                { label: 'Screen', value: 'screen' },
                { label: 'File', value: 'file' },
                { label: 'Other', value: 'other' },
              ],
            },
            {
              name: 'framing',
              type: 'select',
              admin: {
                condition: (_, data) =>
                  Array.isArray(data?.measurementType) &&
                  data.measurementType.includes('physical'),
              },
              options: [
                { label: 'Framed', value: 'framed' },
                { label: 'Unframed', value: 'unframed' },
                { label: 'Artist framed', value: 'artist-framed' },
              ],
            },
            {
              name: 'weight',
              type: 'number',
              admin: {
                description: 'Weight in kilograms (physical works).',
                condition: (_, data) =>
                  Array.isArray(data?.measurementType) &&
                  data.measurementType.includes('physical'),
              },
            },
            {
              type: 'row',
              admin: {
                condition: (_, data) =>
                  Array.isArray(data?.measurementType) &&
                  data.measurementType.includes('physical'),
              },
              fields: [
                {
                  name: 'dimensionUnit',
                  type: 'select',
                  defaultValue: 'cm',
                  options: [
                    { label: 'cm', value: 'cm' },
                    { label: 'in', value: 'in' },
                  ],
                },
              ],
            },
            {
              type: 'row',
              admin: {
                condition: (_, data) =>
                  Array.isArray(data?.measurementType) &&
                  data.measurementType.includes('physical'),
              },
              fields: [
                { name: 'widthWhole', type: 'number', admin: { width: '50%' } },
                {
                  name: 'widthFraction',
                  type: 'text',
                  admin: {
                    width: '50%',
                    description: 'Optional fraction, e.g. 3/16',
                  },
                },
              ],
            },
            {
              type: 'row',
              admin: {
                condition: (_, data) =>
                  Array.isArray(data?.measurementType) &&
                  data.measurementType.includes('physical'),
              },
              fields: [
                { name: 'heightWhole', type: 'number', admin: { width: '50%' } },
                {
                  name: 'heightFraction',
                  type: 'text',
                  admin: { width: '50%', description: 'Optional fraction' },
                },
              ],
            },
            {
              type: 'row',
              admin: {
                condition: (_, data) =>
                  Array.isArray(data?.measurementType) &&
                  data.measurementType.includes('physical'),
              },
              fields: [
                { name: 'depthWhole', type: 'number', admin: { width: '50%' } },
                {
                  name: 'depthFraction',
                  type: 'text',
                  admin: { width: '50%', description: 'Optional fraction' },
                },
              ],
            },
            {
              name: 'widthMm',
              type: 'number',
              admin: {
                readOnly: true,
                description: 'Computed on save (Step 7 hook).',
                condition: (_, data) =>
                  Array.isArray(data?.measurementType) &&
                  data.measurementType.includes('physical'),
              },
            },
            {
              name: 'heightMm',
              type: 'number',
              admin: {
                readOnly: true,
                description: 'Computed on save (Step 7 hook).',
                condition: (_, data) =>
                  Array.isArray(data?.measurementType) &&
                  data.measurementType.includes('physical'),
              },
            },
            {
              name: 'depthMm',
              type: 'number',
              admin: {
                readOnly: true,
                description: 'Computed on save (Step 7 hook).',
                condition: (_, data) =>
                  Array.isArray(data?.measurementType) &&
                  data.measurementType.includes('physical'),
              },
            },
            {
              name: 'dimensionsDisplay',
              type: 'text',
              admin: {
                readOnly: true,
                description: 'Human-readable size string — computed on save (Step 7).',
                condition: (_, data) =>
                  Array.isArray(data?.measurementType) &&
                  data.measurementType.includes('physical'),
              },
            },
            {
              name: 'aspectRatio',
              type: 'number',
              admin: {
                readOnly: true,
                description: 'widthMm ÷ heightMm (physical) or widthPx ÷ heightPx (digital-only).',
              },
            },
            {
              type: 'row',
              admin: {
                condition: (_, data) =>
                  Array.isArray(data?.measurementType) &&
                  data.measurementType.includes('digital'),
              },
              fields: [
                { name: 'widthPx', type: 'number', admin: { width: '50%' } },
                { name: 'heightPx', type: 'number', admin: { width: '50%' } },
              ],
            },
            {
              name: 'resolutionDpi',
              type: 'number',
              admin: {
                condition: (_, data) =>
                  Array.isArray(data?.measurementType) &&
                  data.measurementType.includes('digital'),
              },
            },
            {
              name: 'fileFormat',
              type: 'text',
              admin: {
                description: 'Native working file format (TIFF, PSD, MP4, …).',
                condition: (_, data) =>
                  Array.isArray(data?.measurementType) &&
                  data.measurementType.includes('digital'),
              },
            },
            {
              name: 'fileSize',
              type: 'number',
              admin: {
                description: 'File size in MB.',
                condition: (_, data) =>
                  Array.isArray(data?.measurementType) &&
                  data.measurementType.includes('digital'),
              },
            },
            {
              name: 'colorSpace',
              type: 'select',
              admin: {
                condition: (_, data) =>
                  Array.isArray(data?.measurementType) &&
                  data.measurementType.includes('digital'),
              },
              options: [
                { label: 'sRGB', value: 'sRGB' },
                { label: 'Adobe RGB', value: 'Adobe RGB' },
                { label: 'P3', value: 'P3' },
                { label: 'CMYK', value: 'CMYK' },
                { label: 'Other', value: 'other' },
              ],
            },
            {
              name: 'duration',
              type: 'text',
              admin: {
                description: 'e.g. HH:MM:SS or prose for open-ended works.',
                condition: (_, data) =>
                  Array.isArray(data?.measurementType) &&
                  data.measurementType.includes('time-based'),
              },
            },
            {
              name: 'durationSeconds',
              type: 'number',
              admin: {
                readOnly: true,
                description: 'Computed from duration (Step 7).',
                condition: (_, data) =>
                  Array.isArray(data?.measurementType) &&
                  data.measurementType.includes('time-based'),
              },
            },
            {
              name: 'looped',
              type: 'checkbox',
              defaultValue: false,
              admin: {
                condition: (_, data) =>
                  Array.isArray(data?.measurementType) &&
                  data.measurementType.includes('time-based'),
              },
            },
            {
              name: 'soundDesign',
              type: 'select',
              admin: {
                condition: (_, data) =>
                  Array.isArray(data?.measurementType) &&
                  data.measurementType.includes('time-based'),
              },
              options: [
                { label: 'Sound', value: 'sound' },
                { label: 'Silent', value: 'silent' },
                { label: 'Ambient', value: 'ambient' },
                { label: 'Variable', value: 'variable' },
              ],
            },
            {
              name: 'condition',
              type: 'select',
              options: [
                { label: 'Excellent', value: 'excellent' },
                { label: 'Good', value: 'good' },
                { label: 'Fair', value: 'fair' },
                { label: 'Poor', value: 'poor' },
              ],
            },
            { name: 'conditionNotes', type: 'textarea' },
            {
              name: 'workState',
              type: 'select',
              options: [
                { label: 'Original', value: 'original' },
                { label: 'Reworked', value: 'reworked' },
                { label: 'Restored', value: 'restored' },
                { label: 'Damaged', value: 'damaged' },
                { label: 'Lost', value: 'lost' },
              ],
            },
            { name: 'workStateNotes', type: 'textarea' },
            {
              name: 'workStateDate',
              type: 'date',
              admin: { description: 'Date this work state was recorded.' },
            },
            {
              name: 'materialAndProcessMeaning',
              type: 'textarea',
              localized: true,
              admin: {
                description: 'Why these materials and process choices matter.',
              },
            },
            {
              name: 'stateVersions',
              type: 'json',
              admin: {
                description:
                  'Timestamped change records: [{ date, description, type: restoration|rework|damage|relining|other }]',
              },
            },
            {
              name: 'sizeTier',
              type: 'select',
              admin: {
                description:
                  'Layout tier on the public site. Rule-of-thumb: longest side <150mm → xs; 150–300 → sm; 300–800 → md; 800–2000 → lg; >2000 → xl.',
              },
              options: [
                { label: 'XS', value: 'xs' },
                { label: 'SM', value: 'sm' },
                { label: 'MD', value: 'md' },
                { label: 'LG', value: 'lg' },
                { label: 'XL', value: 'xl' },
              ],
            },
            {
              name: 'orientation',
              type: 'select',
              options: [
                { label: 'Portrait', value: 'portrait' },
                { label: 'Landscape', value: 'landscape' },
                { label: 'Square', value: 'square' },
              ],
            },
          ],
        },

        // ── TAB 3: Classification (§1.4) ────────────────────────
        {
          label: 'Classification',
          fields: [
            {
              name: 'city',
              type: 'text',
              localized: true,
              admin: {
                description: 'City where the work was made (controlled vocabulary).',
              },
            },
            {
              name: 'country',
              type: 'text',
              localized: true,
              admin: {
                description: 'Country (controlled vocabulary).',
              },
            },
            {
              name: 'cityTgnUri',
              type: 'text',
              admin: {
                description: 'Getty TGN URI for the city (JSON-LD / agent).',
              },
            },
            {
              name: 'movementTags',
              type: 'relationship',
              relationTo: 'tags',
              hasMany: true,
              filterOptions: { type: { equals: 'movement' } },
            },
            {
              name: 'styleTags',
              type: 'relationship',
              relationTo: 'tags',
              hasMany: true,
              filterOptions: { type: { equals: 'style' } },
            },
            {
              name: 'subjectTags',
              type: 'relationship',
              relationTo: 'tags',
              hasMany: true,
              filterOptions: { type: { equals: 'subject' } },
            },
            {
              name: 'genreTags',
              type: 'relationship',
              relationTo: 'tags',
              hasMany: true,
              filterOptions: { type: { equals: 'genre' } },
            },
            {
              name: 'periodTags',
              type: 'relationship',
              relationTo: 'tags',
              hasMany: true,
              filterOptions: { type: { equals: 'period' } },
            },
            {
              name: 'conceptualKeywords',
              type: 'array',
              labels: { singular: 'Keyword', plural: 'Conceptual keywords' },
              fields: [{ name: 'keyword', type: 'text', required: true }],
              admin: {
                description: 'Abstract terms (memory, erasure, mediation, …).',
              },
            },
            {
              name: 'events',
              type: 'join',
              collection: 'events',
              on: 'artworks',
              admin: {
                description:
                  'Step 10 — reverse of **Event → Artworks**. Edit memberships only on the event document.',
              },
            },
            {
              name: 'artHistoricalReferences',
              type: 'relationship',
              relationTo: 'art-historical-references',
              hasMany: true,
            },
            {
              name: 'artHistoricalContext',
              type: 'textarea',
              localized: true,
              admin: {
                description: 'Prose on art-historical connections (agent draft, artist confirms).',
              },
            },
            {
              name: 'seriesContext',
              type: 'textarea',
              localized: true,
              admin: {
                description: 'Where this work sits in the practice arc.',
              },
            },
            {
              name: 'consciousRejections',
              type: 'textarea',
              localized: true,
              admin: {
                description: 'What this work pushes against (intent layer).',
              },
            },
            {
              name: 'formalContributionAssessment',
              type: 'textarea',
              localized: true,
              admin: {
                description: 'What this work does that has not been done before.',
              },
            },
          ],
        },

        // ── TAB 4: Description & AI (§1.6–1.7) ─────────────────
        {
          label: 'Description',
          fields: [
            {
              name: 'descriptionShort',
              type: 'text',
              localized: true,
              maxLength: 400,
              admin: {
                description: '1–3 sentences; meta, hover cards, schema.org (EN/DE via locale).',
              },
            },
            {
              name: 'descriptionLong',
              type: 'richText',
              localized: true,
              admin: { description: 'Extended catalogue entry (EN/DE via locale).' },
            },
            {
              name: 'description',
              type: 'richText',
              localized: true,
              admin: {
                hidden: true,
                description: 'Legacy body — prefer descriptionLong; kept for unmigrated rows.',
              },
            },
            {
              name: 'intent',
              type: 'textarea',
              localized: true,
              admin: { description: 'Artist: what the work means and does (first person). Never AI-generated.' },
            },
            {
              name: 'intentVsOutcome',
              type: 'textarea',
              localized: true,
              admin: { description: 'Intended vs actual outcome; productive failure.' },
            },
            {
              name: 'makingNote',
              type: 'textarea',
              localized: true,
              admin: { description: 'Experiential account of making (first person).' },
            },
            {
              name: 'directInspiration',
              type: 'text',
              localized: true,
              admin: { description: 'Immediate seed (image, detail, memory) — not full art-historical context.' },
            },
            {
              name: 'encounterNote',
              type: 'textarea',
              localized: true,
              admin: { description: 'Standing in front of the work: scale, surface, light.' },
            },
            {
              name: 'workContext',
              type: 'textarea',
              localized: true,
              admin: { description: 'Where this sits in the practice flow vs neighbouring works.' },
            },
            {
              name: 'processNotes',
              type: 'textarea',
              localized: true,
              admin: { description: 'Factual technique / departures from series norms (dialogue + inference).' },
            },
            {
              name: 'sourceMaterials',
              type: 'textarea',
              localized: true,
              admin: { description: 'Photographic or archival sources incorporated; blank if none.' },
            },
            {
              name: 'aiDescription',
              type: 'textarea',
              localized: true,
              admin: {
                description: 'Agent visual draft — starting point for artist-edited public text.',
              },
            },
            {
              name: 'aiVibe',
              type: 'textarea',
              admin: {
                description: 'Semantic/mood seed — can inform encounterNote and embeddings pipeline.',
              },
            },
            {
              name: 'dominantColors',
              type: 'array',
              labels: { singular: 'Swatch', plural: 'Dominant colors (hex)' },
              fields: [{ name: 'hex', type: 'text', required: true }],
              admin: { description: 'Agent-suggested hex values; artist may correct.' },
            },
            {
              name: 'paintedFieldColors',
              type: 'array',
              labels: { singular: 'Swatch', plural: 'Painted field colors (hex)' },
              fields: [{ name: 'hex', type: 'text', required: true }],
              admin: {
                description: 'Acrylic field areas vs transfer — when medium includes paint.',
              },
            },
            {
              name: 'compositionalNotes',
              type: 'textarea',
              admin: {
                description: 'Agent: composition, visual weight, dominant direction.',
              },
            },
            {
              name: 'analysisModelVersion',
              type: 'text',
              admin: {
                description: 'Pipeline version, e.g. model + CLIP checkpoint.',
              },
            },
            {
              name: 'recognitionTimeline',
              type: 'json',
              admin: {
                description:
                  'Artist-layer visibility history: [{ date, event, context, effect }]. JSON per Addendum F.',
              },
            },
            {
              name: 'clipEmbedding',
              type: 'json',
              admin: {
                hidden: true,
                readOnly: true,
                description:
                  'CLIP embedding stored as vector(768) — CLIP ViT-L/14 output. Use SQL/API for similarity, not this cell.',
              },
              custom: { dbType: 'vector(768)' },
            },
            {
              name: 'clipEmbeddingGeneratedAt',
              type: 'date',
              admin: {
                hidden: true,
                readOnly: true,
                description: 'When the CLIP embedding was last generated for this artwork.',
              },
            },
            {
              name: 'embeddings',
              type: 'array',
              admin: {
                description:
                  'Metadata for each embedding model run. Vectors stored in pgvector columns, not here.',
              },
              fields: [
                {
                  name: 'model',
                  type: 'select',
                  required: true,
                  options: [
                    { label: 'CLIP ViT-L/14', value: 'clip-vit-large-patch14' },
                    { label: 'DINOv2 Large', value: 'dinov2-large' },
                  ],
                },
                {
                  name: 'dimensions',
                  type: 'number',
                  required: true,
                },
                {
                  name: 'pgVectorColumn',
                  type: 'text',
                  required: true,
                  admin: {
                    description:
                      "The pgvector column name where this model's vector is stored, e.g. clip_embedding",
                  },
                },
                {
                  name: 'generatedDate',
                  type: 'date',
                },
                {
                  name: 'specUrl',
                  type: 'text',
                },
                {
                  name: 'shortDescription',
                  type: 'text',
                },
              ],
            },
            {
              name: 'visionAnalyses',
              type: 'array',
              fields: [
                {
                  name: 'text',
                  type: 'textarea',
                  required: true,
                },
                {
                  name: 'model',
                  type: 'text',
                  required: true,
                  admin: {
                    description:
                      'Exact model version string, e.g. claude-sonnet-4-6, gpt-4o, gemini-2.5-pro, deepseek-vl2',
                  },
                },
                {
                  name: 'date',
                  type: 'date',
                  required: true,
                  defaultValue: () => new Date().toISOString(),
                },
              ],
            },
            {
              name: 'embedding',
              type: 'json',
              admin: {
                readOnly: true,
                description: 'Legacy JSON embedding placeholder — migrate to clipEmbedding / drop after cutover.',
              },
            },
            {
              name: 'keywords',
              type: 'array',
              fields: [{ name: 'keyword', type: 'text' }],
            },
            {
              name: 'genre',
              type: 'text',
              localized: true,
              admin: {
                description: 'Deprecated free-text genre — prefer Classification → genreTags.',
              },
            },
          ],
        },

        // ── TAB 5: Media (§1.5) ─────────────────────────────────
        {
          label: 'Media',
          fields: [
            {
              name: 'alternateViewImages',
              type: 'array',
              labels: { singular: 'View', plural: 'Alternate views' },
              fields: [
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  required: true,
                },
                { name: 'caption', type: 'text', localized: true },
                { name: 'altText', type: 'text', localized: true },
                {
                  name: 'aspectRatio',
                  type: 'number',
                  admin: { description: 'Width ÷ height for layout.' },
                },
              ],
              admin: {
                description:
                  'Other photographs that are part of understanding the work — different angles (e.g. sculpture sides), verso, raking light, scale in hand. Not studio/process documentation (use Documentation photos).',
              },
            },
            {
              name: 'detailImages',
              type: 'array',
              labels: { singular: 'Detail', plural: 'Detail images' },
              fields: [
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  required: true,
                },
                { name: 'caption', type: 'text', localized: true },
                { name: 'altText', type: 'text', localized: true },
                { name: 'aspectRatio', type: 'number' },
              ],
              admin: {
                description: 'Close-ups — texture, passage, signature, material surface.',
              },
            },
            {
              name: 'installationShots',
              type: 'array',
              labels: { singular: 'Shot', plural: 'Installation shots' },
              fields: [
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  required: true,
                },
                { name: 'venue', type: 'text' },
                { name: 'date', type: 'date' },
                { name: 'altText', type: 'text', localized: true },
                { name: 'aspectRatio', type: 'number' },
              ],
              admin: {
                description: 'Work shown installed in a space (venue and date optional).',
              },
            },
            {
              name: 'documentationImages',
              type: 'array',
              labels: { singular: 'Documentation photo', plural: 'Documentation photos' },
              fields: [
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  required: true,
                },
                { name: 'caption', type: 'text', localized: true },
                { name: 'altText', type: 'text', localized: true },
                { name: 'aspectRatio', type: 'number' },
                {
                  name: 'documentationRole',
                  type: 'select',
                  options: [
                    { label: 'Studio / work in progress', value: 'studio' },
                    { label: 'Process / making', value: 'process' },
                    { label: 'Materials / condition', value: 'condition' },
                    { label: 'Publication / press', value: 'publication' },
                    { label: 'Other', value: 'other' },
                  ],
                },
              ],
              admin: {
                description:
                  'Photographs that document the work’s making or context — not other angles of the finished piece (use Alternate views) and not gallery installation (use Installation shots).',
              },
            },
            {
              name: 'arTargetImage',
              type: 'upload',
              relationTo: 'media',
              admin: {
                description: 'AR target (e.g. Mediums of Perception / mind.js). Series-specific.',
              },
            },
            {
              name: 'videoFile',
              type: 'upload',
              relationTo: 'media',
              admin: {
                description: 'Primary video file (MP4, MOV, WebM). Wins over videoUrl if both set.',
              },
            },
            {
              name: 'videoUrl',
              type: 'text',
              admin: {
                description:
                  'YouTube/Vimeo URL. When a videoFile is set, only a YouTube link is kept here as an external “watch on YouTube” link — it is not embedded.',
              },
            },
            {
              name: 'videoCaption',
              type: 'text',
              localized: true,
            },
            {
              name: 'documentationVideoUrl',
              type: 'text',
              admin: {
                description: 'Documentation of a physical work (walkthrough, process film) — URL.',
              },
            },
            {
              name: 'documentationVideoFile',
              type: 'upload',
              relationTo: 'media',
              admin: {
                description: 'Documentation video upload. Wins over documentationVideoUrl if both set.',
              },
            },
            {
              name: 'videos',
              type: 'array',
              admin: {
                description: 'Additional clips (making-of, interviews, etc.). Use videoRole primary/documentation for JSON-LD mapping.',
              },
              fields: [
                {
                  name: 'videoType',
                  type: 'select',
                  required: true,
                  options: [
                    { label: 'Upload (R2)', value: 'upload' },
                    { label: 'YouTube', value: 'youtube' },
                    { label: 'Vimeo', value: 'vimeo' },
                    { label: 'Other URL', value: 'url' },
                  ],
                },
                {
                  name: 'videoFile',
                  type: 'upload',
                  relationTo: 'media',
                  admin: {
                    condition: (_, s) => s?.videoType === 'upload',
                  },
                },
                {
                  name: 'videoUrl',
                  type: 'text',
                  admin: {
                    condition: (_, s) => s?.videoType !== 'upload',
                  },
                },
                {
                  name: 'posterImage',
                  type: 'upload',
                  relationTo: 'media',
                },
                { name: 'title', type: 'text', localized: true },
                { name: 'description', type: 'textarea', localized: true },
                {
                  name: 'videoRole',
                  type: 'select',
                  options: [
                    { label: 'Primary', value: 'primary' },
                    { label: 'Documentation', value: 'documentation' },
                    { label: 'Making Of', value: 'makingOf' },
                    { label: 'AR Experience', value: 'ar' },
                    { label: 'Interview', value: 'interview' },
                    { label: 'Other', value: 'other' },
                  ],
                },
              ],
            },
            {
              name: 'additionalImages',
              type: 'array',
              admin: {
                hidden: true,
                description: 'Deprecated — migrate to alternateViewImages / detailImages / installationShots.',
              },
              fields: [
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  required: true,
                },
                { name: 'caption', type: 'text', localized: true },
                {
                  name: 'imageRole',
                  type: 'select',
                  options: [
                    { label: 'Detail', value: 'detail' },
                    { label: 'Installation View', value: 'installation' },
                    { label: 'Process', value: 'process' },
                    { label: 'Reverse', value: 'reverse' },
                    { label: 'Other', value: 'other' },
                  ],
                },
              ],
            },
          ],
        },

        fieldNotesTab,

        // ── TAB: AR (Quick Look / model-viewer) ─────────────────
        {
          label: 'AR',
          admin: { description: 'Wall AR from primary image + dimensions (metres).' },
          fields: [
            {
              name: 'arEnabled',
              type: 'checkbox',
              defaultValue: false,
            },
            {
              name: 'arWidthM',
              type: 'number',
              admin: { description: 'Metres; defaults from width mm ÷ 1000 on save.' },
            },
            {
              name: 'arHeightM',
              type: 'number',
              admin: { description: 'Metres; defaults from height mm ÷ 1000 on save.' },
            },
            {
              name: 'arDepthM',
              type: 'number',
              admin: { description: 'Depth in metres (framed works).' },
            },
            {
              name: 'arModelUrl',
              type: 'text',
              admin: { readOnly: true, description: 'Generated .usdz URL (R2).' },
            },
            {
              name: 'arModelGlbUrl',
              type: 'text',
              admin: { readOnly: true, description: 'Generated .glb URL for Android.' },
            },
            {
              name: 'arAllowScaling',
              type: 'checkbox',
              defaultValue: true,
            },
            {
              name: 'arLastGenerated',
              type: 'date',
              admin: { readOnly: true },
            },
          ],
        },

        // ── TAB 6: Location ───────────────────────────────────
        {
          label: 'Location',
          fields: [
            {
              name: 'locationCreated',
              type: 'group',
              fields: [
                {
                  name: 'label',
                  type: 'text',
                  admin: { description: 'e.g. studio in CANK, Neukölln' },
                },
                { name: 'city', type: 'text' },
                { name: 'country', type: 'text' },
                { name: 'countryCode', type: 'text' },
                { name: 'lat', type: 'number' },
                { name: 'lng', type: 'number' },
                {
                  name: 'mapPicker',
                  type: 'ui',
                  admin: {
                    components: {
                      Field: '/components/admin/MapField#MapField',
                    },
                  },
                },
              ],
            },
          ],
        },

        // ── TAB 7: Provenance (§1.9 — private) ─────────────────
        {
          label: 'Provenance',
          admin: {
            description: 'Staff-only: not exposed on anonymous API responses.',
          },
          fields: [
            {
              name: 'artworkHolder',
              type: 'group',
              access: privateFieldAccess,
              fields: [
                {
                  name: 'holderType',
                  type: 'select',
                  defaultValue: 'Person',
                  options: [
                    { label: 'Person', value: 'Person' },
                    { label: 'Organization', value: 'Organization' },
                  ],
                },
                {
                  name: 'holderName',
                  type: 'text',
                  admin: { description: 'Display name for the current holder (private).' },
                },
                { name: 'holderUrl', type: 'text' },
              ],
            },
            {
              name: 'provenanceNotes',
              type: 'richText',
              access: privateFieldAccess,
            },
            {
              name: 'currentLocation',
              type: 'group',
              access: publicReadStaffWriteAccess,
              fields: [
                {
                  name: 'category',
                  type: 'select',
                  options: [
                    { label: "Artist's studio", value: 'artists-studio' },
                    { label: 'Private collection', value: 'private-collection' },
                    { label: 'Institution', value: 'institution' },
                    { label: 'On loan', value: 'on-loan' },
                  ],
                },
                {
                  name: 'locationDetail',
                  type: 'textarea',
                  admin: { description: 'Address or holder detail (private).' },
                },
              ],
            },
            {
              name: 'ownershipHistory',
              type: 'json',
              access: publicReadStaffWriteAccess,
              admin: {
                description:
                  'JSON array: { transactionId, ownerPrivate, displayName, city, dateAcquired, dateRelinquished, claimStatus, collectorVisible, notes }. Link sales via transactionId.',
              },
            },
            {
              name: 'provenanceOriginKnown',
              type: 'checkbox',
              defaultValue: true,
              access: publicReadStaffWriteAccess,
              admin: {
                description:
                  'Uncheck when the studio-to-first-owner chain is not traceable.',
              },
            },
            {
              name: 'loanHistory',
              type: 'json',
              access: publicReadStaffWriteAccess,
              admin: {
                description:
                  'JSON array: { institution, dateOut, dateReturned, eventId (numeric id → events), notes }.',
              },
            },
            {
              name: 'provenanceConfidenceLayer',
              type: 'json',
              access: publicReadStaffWriteAccess,
              admin: {
                description:
                  'JSON array: { claim, evidenceBasis, confidenceLevel: documented-fact | credible-inference | institutional-assertion | speculation }.',
              },
            },
            {
              name: 'relatedWorks',
              type: 'array',
              labels: { singular: 'Related work', plural: 'Related works' },
              access: publicReadStaffWriteAccess,
              admin: {
                description:
                  'Links to other distinct artworks (or note-only entries). Does not merge ownership or provenance across records.',
              },
              fields: [
                {
                  name: 'relatedArtwork',
                  type: 'relationship',
                  relationTo: 'artworks',
                  admin: {
                    description:
                      'Use when the related work has its own Artwork record. Leave empty and use relatedWorkNote if no record exists yet.',
                  },
                },
                {
                  name: 'relationshipType',
                  type: 'select',
                  options: [
                    {
                      label: 'Derivative — oil painting interpretation',
                      value: 'derivative-oil-painting',
                    },
                    { label: 'Derivative — other medium', value: 'derivative-other' },
                    { label: 'Same series, related composition', value: 'series-related' },
                    { label: 'Other', value: 'other' },
                  ],
                },
                {
                  name: 'relatedWorkNote',
                  type: 'textarea',
                  admin: {
                    description:
                      'Short public-facing description. Required when relatedArtwork is empty; optional supplement when linked.',
                  },
                },
              ],
            },
            {
              name: 'hasEditions',
              type: 'select',
              defaultValue: 'none',
              options: [
                { label: 'None', value: 'none' },
                { label: 'Limited', value: 'limited' },
                { label: 'Open', value: 'open' },
              ],
              admin: {
                description:
                  'Whether this work has tracked edition tiers (DCS/Megacities editionTiers, or ownershipRegistry for other works).',
              },
            },
            {
              name: 'ownershipRegistry',
              type: 'array',
              labels: { singular: 'Edition tier', plural: 'Ownership registry' },
              admin: {
                description:
                  'Per-copy ownership for non-DCS/Megacities works (e.g. giclée tiers on A Colorful History). DCS and Megacities use copies[] on their edition tier tabs instead.',
              },
              fields: [
                {
                  name: 'tierLabel',
                  type: 'text',
                  required: true,
                  admin: {
                    description: 'Display label, e.g. "Small giclée".',
                  },
                },
                {
                  name: 'tierOrder',
                  type: 'number',
                  required: true,
                },
                {
                  name: 'editionSize',
                  type: 'number',
                  required: true,
                  admin: {
                    description: 'Numbered copies only — excludes AP count.',
                  },
                },
                { name: 'apCount', type: 'number', defaultValue: 0 },
                editionTierIsOriginalTierField,
                ...editionTierDimensionFields,
                editionTierSubstrateField,
                editionTierPrintTechniqueField,
                {
                  name: 'copies',
                  type: 'array',
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
                    { name: 'dateAcquired', type: 'text' },
                    {
                      name: 'claimedCopyNumberKnown',
                      type: 'checkbox',
                      defaultValue: false,
                    },
                    {
                      name: 'notes',
                      type: 'textarea',
                      access: privateFieldAccess,
                    },
                  ],
                },
              ],
            },
            {
              name: 'untrackedEditionsNote',
              type: 'textarea',
              localized: true,
              admin: {
                description:
                  'Public prose for informal/unnumbered print runs not tracked in ownershipRegistry.',
              },
            },
            {
              name: 'componentCount',
              type: 'number',
              min: 1,
              admin: {
                description:
                  'Physical components sold as one unit (e.g. triptych). Affects gallery panel labels only.',
              },
            },
          ],
        },

        // ── TAB 8: Exhibition history (Events) ───────────────────
        {
          label: 'Exhibition history',
          admin: {
            description:
              'Canonical CV/show history: add this work on each **Event** (Event → Artworks); reverse join appears under Classification → Events.',
          },
          fields: [
            {
              name: 'exhibitionHistory',
              type: 'array',
              labels: { singular: 'Showing', plural: 'Exhibition history (Events)' },
              fields: [
                {
                  name: 'event',
                  type: 'relationship',
                  relationTo: 'events',
                  required: true,
                },
                {
                  name: 'workIncluded',
                  type: 'checkbox',
                  defaultValue: true,
                },
                { name: 'notes', type: 'text' },
              ],
              admin: {
                description: 'Optional manual cross-links; prefer assigning works on the Event document.',
              },
            },
          ],
        },

        // ── TAB 9: Commerce (§1.8 — private except editions) ───
        {
          label: 'Commerce',
          admin: {
            description:
              'Pricing and sales are staff-only. Edition programme fields are public read for the website.',
          },
          fields: [
            {
              name: 'availabilityStatus',
              type: 'select',
              access: publicReadStaffWriteAccess,
              options: [
                { label: 'Available', value: 'available' },
                { label: 'Sold', value: 'sold' },
                { label: 'Not for sale', value: 'not-for-sale' },
                { label: 'On loan', value: 'on-loan' },
                { label: 'Reserved', value: 'reserved' },
                { label: 'On consignment', value: 'on-consignment' },
              ],
            },
            {
              name: 'consignmentDetails',
              type: 'textarea',
              access: privateFieldAccess,
              admin: {
                condition: (_, data) => data?.availabilityStatus === 'on-consignment',
                description: 'Gallery and dates when on consignment.',
              },
            },
            {
              name: 'listingCurrency',
              type: 'select',
              access: privateFieldAccess,
              defaultValue: 'EUR',
              options: [
                { label: 'EUR', value: 'EUR' },
                { label: 'USD', value: 'USD' },
                { label: 'GBP', value: 'GBP' },
                { label: 'CHF', value: 'CHF' },
                { label: 'Other', value: 'other' },
              ],
            },
            {
              name: 'askingPrice',
              type: 'number',
              access: privateFieldAccess,
              admin: { description: 'In listingCurrency.' },
            },
            {
              name: 'originalAskingPrice',
              type: 'number',
              access: privateFieldAccess,
            },
            {
              name: 'priceNotes',
              type: 'textarea',
              access: privateFieldAccess,
            },
            {
              name: 'insuranceValue',
              type: 'number',
              access: privateFieldAccess,
            },
            {
              name: 'insuranceValueDate',
              type: 'date',
              access: privateFieldAccess,
            },
            {
              name: 'galleryReference',
              type: 'text',
              access: publicReadStaffWriteAccess,
              admin: { description: 'Public gallery name when on consignment; otherwise internal reference.' },
            },
            {
              name: 'galleryText',
              type: 'textarea',
              localized: true,
              admin: {
                description: 'Wall text / press release for this work (when applicable).',
              },
            },
            {
              name: 'salesRecord',
              type: 'json',
              access: privateFieldAccess,
              admin: {
                description:
                  'JSON array of sales: transactionId (UUID), saleDate, salePrice, saleCurrency, exchangeRateToEur, buyerPrivate, buyerCity, channel, galleryName, auctionHouse, invoiceReference, commissionRate, netToArtist, vatApplicable, vatRate, editionNumber, notes.',
              },
            },
            {
              name: 'totalRevenue',
              type: 'number',
              access: privateFieldAccess,
              admin: {
                readOnly: true,
                description: 'Σ netToArtist × exchangeRateToEur — computed on save.',
              },
            },
            {
              name: 'editionType',
              type: 'select',
              access: publicReadStaffWriteAccess,
              options: [
                { label: 'Unique', value: 'unique' },
                { label: 'Limited edition', value: 'limited-edition' },
                { label: 'Open edition', value: 'open-edition' },
                { label: 'Artist proof only', value: 'artist-proof-only' },
              ],
            },
            {
              name: 'editions',
              type: 'array',
              access: publicReadStaffWriteAccess,
              labels: { singular: 'Edition', plural: 'Editions (public)' },
              fields: [
                { name: 'formatLabel', type: 'text', required: true },
                { name: 'widthCm', type: 'number' },
                { name: 'heightCm', type: 'number' },
                { name: 'substrate', type: 'text' },
                {
                  name: 'printTechnique',
                  type: 'select',
                  options: [
                    { label: 'Giclée', value: 'giclee' },
                    { label: 'Screenprint', value: 'screenprint' },
                    { label: 'Lithograph', value: 'lithograph' },
                    { label: 'Etching', value: 'etching' },
                    { label: 'Other', value: 'other' },
                  ],
                },
                { name: 'totalEditionSize', type: 'number' },
                { name: 'artistProofs', type: 'number' },
                { name: 'remaining', type: 'number' },
                { name: 'pricePerPrint', type: 'number' },
                {
                  name: 'currency',
                  type: 'select',
                  defaultValue: 'EUR',
                  options: [
                    { label: 'EUR', value: 'EUR' },
                    { label: 'USD', value: 'USD' },
                    { label: 'GBP', value: 'GBP' },
                  ],
                },
                { name: 'certificate', type: 'checkbox', defaultValue: false },
                {
                  name: 'signature',
                  type: 'select',
                  options: [
                    { label: 'Signed', value: 'signed' },
                    { label: 'Unsigned', value: 'unsigned' },
                    { label: 'Signed on request', value: 'signed-on-request' },
                  ],
                },
                { name: 'notes', type: 'textarea' },
              ],
            },
            {
              name: 'editionNotes',
              type: 'textarea',
              localized: true,
              access: publicReadStaffWriteAccess,
              admin: { description: 'Public-facing notes on the edition programme.' },
            },
            {
              name: 'isForSale',
              type: 'checkbox',
              defaultValue: false,
              admin: {
                hidden: true,
                description: 'Legacy — use availabilityStatus.',
              },
            },
            {
              name: 'offers',
              type: 'group',
              admin: {
                hidden: true,
                condition: (data) => Boolean(data?.isForSale),
              },
              fields: [
                { name: 'price', type: 'number' },
                {
                  name: 'priceCurrency',
                  type: 'select',
                  defaultValue: 'EUR',
                  options: [
                    { label: 'EUR €', value: 'EUR' },
                    { label: 'USD $', value: 'USD' },
                    { label: 'GBP £', value: 'GBP' },
                  ],
                },
                {
                  name: 'availability',
                  type: 'select',
                  defaultValue: 'https://schema.org/InStock',
                  options: [
                    { label: 'For Sale', value: 'https://schema.org/InStock' },
                    { label: 'Sold', value: 'https://schema.org/SoldOut' },
                    { label: 'On Request', value: 'https://schema.org/PreOrder' },
                  ],
                },
                { name: 'inquiryUrl', type: 'text' },
              ],
            },
            {
              name: 'printEditions',
              type: 'array',
              admin: {
                hidden: true,
                description: 'Legacy — migrate rows into editions[].',
              },
              fields: [
                { name: 'editionSize', type: 'number' },
                {
                  name: 'format',
                  type: 'text',
                  admin: { description: 'e.g. A3, 50x70cm' },
                },
                {
                  name: 'substrate',
                  type: 'text',
                  admin: { description: 'e.g. matte paper, dibond' },
                },
                { name: 'price', type: 'number' },
                {
                  name: 'priceCurrency',
                  type: 'select',
                  defaultValue: 'EUR',
                  options: [
                    { label: 'EUR €', value: 'EUR' },
                    { label: 'USD $', value: 'USD' },
                    { label: 'GBP £', value: 'GBP' },
                  ],
                },
                {
                  name: 'availability',
                  type: 'select',
                  defaultValue: 'https://schema.org/InStock',
                  options: [
                    { label: 'Available', value: 'https://schema.org/InStock' },
                    { label: 'Sold Out', value: 'https://schema.org/SoldOut' },
                  ],
                },
              ],
            },
          ],
        },

        // ── TAB 10: SEO ────────────────────────────────────────
        {
          label: 'SEO',
          fields: [
            {
              name: 'metaTitle',
              type: 'text',
              localized: true,
              admin: {
                description: 'Optional override. When empty, the public site uses the artwork title.',
              },
            },
            {
              name: 'metaDescription',
              type: 'textarea',
              localized: true,
              admin: {
                description:
                  'Optional override. When empty, the public site uses descriptionShort.',
              },
            },
            {
              name: 'sameAs',
              type: 'array',
              admin: {
                description: 'Labeled external links for SEO. For schema.org URI list see Schema.org tab.',
              },
              fields: [
                { name: 'url', type: 'text', required: true },
                { name: 'label', type: 'text' },
              ],
            },
          ],
        },

        // ── TAB 11: Schema.org (§1.10 — Step 12 stubs for Step 13 JSON-LD) ──
        {
          label: 'Schema.org',
          admin: {
            description:
              'Rights + external IDs for structured data. jsonldPreview is filled by the generator hook in Step 13.',
          },
          fields: [
            {
              name: 'license',
              type: 'select',
              admin: {
                description: 'Maps to rightsstatement.org / CC URIs in JSON-LD output.',
              },
              options: [
                { label: 'All rights reserved', value: 'all-rights-reserved' },
                { label: 'CC BY', value: 'cc-by' },
                { label: 'CC BY-NC', value: 'cc-by-nc' },
                { label: 'CC BY-NC-ND', value: 'cc-by-nc-nd' },
                { label: 'CC BY-SA', value: 'cc-by-sa' },
              ],
            },
            {
              name: 'creditText',
              type: 'textarea',
              localized: true,
              admin: {
                description: 'Attribution line, e.g. Bernard Bolter, Title, 2021. Courtesy the artist.',
              },
            },
            {
              name: 'sameAsUrls',
              type: 'array',
              labels: { singular: 'URI', plural: 'sameAs (plain URIs)' },
              fields: [{ name: 'url', type: 'text', required: true }],
              admin: {
                description: 'Wikidata, institution, catalogue URLs for schema.org sameAs array.',
              },
            },
            {
              name: 'jsonldPreview',
              type: 'json',
              admin: {
                readOnly: true,
                description: 'Last generated VisualArtwork JSON-LD (Step 13).',
              },
            },
            {
              name: 'jsonldWidthPreview',
              type: 'json',
              admin: {
                readOnly: true,
                description: 'Stub: QuantitativeValue width — optional sub-preview for debugging.',
              },
            },
            {
              name: 'jsonldHeightPreview',
              type: 'json',
              admin: {
                readOnly: true,
                description: 'Stub: QuantitativeValue height.',
              },
            },
            {
              name: 'jsonldCreatorPreview',
              type: 'json',
              admin: {
                readOnly: true,
                description: 'Stub: schema.org Person + identifier[] (ULAN, Wikidata).',
              },
            },
          ],
        },

        // ── TAB 12: Mediums of Perception (§1.11) ─────────────
        {
          label: 'Mediums of Perception',
          admin: {
            condition: (data) => data?.seriesSlug === 'mediums-of-perception',
          },
          fields: [
            {
              name: 'mop_sourcePhotographDetails',
              type: 'textarea',
              localized: true,
              admin: { description: 'Source photograph: technology, origin, historical context.' },
            },
            {
              name: 'mop_imageCaptureType',
              type: 'select',
              options: [
                { label: 'Daguerreotype', value: 'daguerreotype' },
                { label: 'Ambrotype', value: 'ambrotype' },
                { label: 'Lithograph', value: 'lithograph' },
                { label: 'Aerial', value: 'aerial' },
                { label: 'Satellite', value: 'satellite' },
                { label: 'Digital', value: 'digital' },
              ],
            },
            {
              name: 'mop_historicalContext',
              type: 'richText',
              localized: true,
              admin: { description: 'Historical context (EN/DE via locale).' },
            },
            {
              name: 'mop_triptychPosition',
              type: 'select',
              options: [
                { label: 'Panel 1', value: 'panel-1' },
                { label: 'Panel 2', value: 'panel-2' },
                { label: 'Panel 3', value: 'panel-3' },
                { label: 'Standalone', value: 'standalone' },
              ],
            },
            {
              name: 'mop_triptychGroupNote',
              type: 'text',
              admin: {
                description:
                  'Triptych grouping label or id (replace with relation → TriptychGroups when that collection exists).',
              },
            },
            { name: 'mop_arVideoUrl', type: 'text', admin: { description: 'AR video layer (mind.js).' } },
            {
              name: 'mop_arRapScript',
              type: 'textarea',
              admin: { description: 'Rap script for AR audio layer.' },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'mop_lat',
                  type: 'number',
                  admin: { width: '50%', description: 'Map pin (series-specific).' },
                },
                {
                  name: 'mop_lng',
                  type: 'number',
                  admin: { width: '50%' },
                },
              ],
            },
          ],
        },

        // ── TAB 13: A Colorful History ────────────────────────
        // Spec: docs/handoff-ach-schema-extension.md (Part 2, Groups 1–7).
        // All fields namespaced under the `ach` group so they don't collide with
        // the model-viewer AR tab (top-level `arEnabled`, `arVideos`, etc).
        {
          label: 'A Colorful History',
          admin: {
            condition: (data) => data?.seriesSlug === 'a-colorful-history',
          },
          fields: [
            {
              type: 'collapsible',
              label: 'Process media',
              admin: {
                initCollapsed: false,
                description: 'Final reference and timelapse output for this work.',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'finalReferenceImage',
                      type: 'upload',
                      relationTo: 'media',
                      admin: {
                        width: '50%',
                        description: 'Final studio reference used for timelapse correction.',
                      },
                    },
                    {
                      name: 'timelapseFile',
                      type: 'upload',
                      relationTo: 'media',
                      admin: {
                        width: '50%',
                        description: 'Generated timelapse output.',
                      },
                    },
                  ],
                },
              ],
            },
            {
              name: 'ach',
              type: 'group',
              admin: {
                description:
                  'A Colorful History series-specific data. Sub-groups map to spec Groups 1–7.',
              },
              fields: [
                // ── Internal grouping / sub-series ────────────────
                {
                  name: 'internalGroupTitle',
                  type: 'text',
                  admin: {
                    description:
                      'Optional internal sub-series or thematic group name within ACH (e.g. "Gates of Perception", "Bridges of Europe"). Not displayed publicly — editorial organisation only.',
                  },
                },
                // ── Group 1 — Map & Tour ──────────────────────
                {
                  name: 'mapAndTour',
                  type: 'group',
                  label: 'Map & tour',
                  fields: [
                    {
                      name: 'mapPresence',
                      type: 'checkbox',
                      defaultValue: false,
                      admin: {
                        description:
                          'Whether this artwork appears on the ACH map. Default false; false for all MoW works.',
                      },
                    },
                    {
                      type: 'row',
                      fields: [
                        {
                          name: 'lat',
                          type: 'number',
                          admin: {
                            width: '50%',
                            description: 'GPS latitude. Null if mapPresence is false.',
                          },
                        },
                        {
                          name: 'lng',
                          type: 'number',
                          admin: {
                            width: '50%',
                            description: 'GPS longitude. Null if mapPresence is false.',
                          },
                        },
                      ],
                    },
                    {
                      name: 'cityPlaceholderColor',
                      type: 'text',
                      admin: {
                        readOnly: true,
                        description:
                          'Computed from base city field via the Group 1 mapping. Never manually edited.',
                      },
                    },
                    {
                      name: 'tourSequence',
                      type: 'number',
                      admin: {
                        description:
                          'Position in the series tour for this artwork city. Set only when a tour is active.',
                      },
                    },
                    {
                      name: 'grandTour',
                      type: 'checkbox',
                      defaultValue: false,
                      admin: { description: 'Include in the Grand Tour sequence.' },
                    },
                    {
                      name: 'grandTourSequence',
                      type: 'number',
                      admin: {
                        condition: (_, sibling) => Boolean(sibling?.grandTour),
                        description: 'Position in the Grand Tour. Set only when grandTour is true.',
                      },
                    },
                    {
                      name: 'tourStopCopy',
                      type: 'richText',
                      localized: true,
                      admin: {
                        description:
                          'What Bernard says when this stop is active in a tour. 2–4 sentences, first person. Never drafted by the agent.',
                      },
                    },
                  ],
                },

                // ── Group 2 — Overlay & Colour ────────────────
                {
                  name: 'overlay',
                  type: 'group',
                  label: 'Overlay & colour',
                  fields: [
                    {
                      name: 'overlayColors',
                      type: 'array',
                      labels: { singular: 'Hex', plural: 'Overlay colors' },
                      minRows: 0,
                      maxRows: 3,
                      fields: [{ name: 'hex', type: 'text', required: true }],
                      validate: ((value: unknown) => {
                        if (value == null) return true
                        if (!Array.isArray(value)) return 'Must be an array.'
                        if (value.length !== 0 && value.length !== 3) {
                          return 'overlayColors must contain exactly 3 hex strings.'
                        }
                        return true
                      }) as any,
                      admin: {
                        description:
                          'Exactly 3 colours extracted from painted fields. Ordered: used for overlay rects (rotating) and AR buttons (fixed positions).',
                      },
                    },
                    {
                      name: 'overlayRects',
                      type: 'array',
                      labels: { singular: 'Rect', plural: 'Overlay rects (1–4)' },
                      minRows: 0,
                      maxRows: 4,
                      fields: [
                        { name: 'color', type: 'text', required: true },
                        { name: 'x', type: 'text', required: true, admin: { description: 'Percent string e.g. "8%".' } },
                        { name: 'y', type: 'text', required: true, admin: { description: 'Percent string.' } },
                        { name: 'w', type: 'text', required: true, admin: { description: 'Percent string.' } },
                        { name: 'h', type: 'text', required: true, admin: { description: 'Percent string.' } },
                      ],
                      admin: {
                        description:
                          'Maximum 4 rectangles, positioned as percentage strings. Resolution-independent — never pixels or floats.',
                      },
                    },
                  ],
                },

                // ── Group 3 — Source Photograph ───────────────
                {
                  name: 'sourcePhotographs',
                  type: 'array',
                  labels: { singular: 'Source photograph', plural: 'Source photographs' },
                  admin: {
                    description:
                      'Historical photographs transferred to canvas. Add one or more; the first is mirrored to the primary source record below.',
                  },
                  fields: [
                    {
                      name: 'sourceImage',
                      type: 'upload',
                      relationTo: 'media',
                      required: true,
                    },
                    {
                      name: 'sourceTitle',
                      type: 'text',
                      localized: true,
                      admin: { description: 'Optional title for this source image.' },
                    },
                  ],
                },
                {
                  name: 'sourcePhotograph',
                  type: 'group',
                  label: 'Primary source photograph (metadata)',
                  admin: {
                    description:
                      'Structured metadata for the main source image. Image file may also be listed in Source photographs above.',
                  },
                  fields: [
                    {
                      name: 'sourceImage',
                      type: 'upload',
                      relationTo: 'media',
                      admin: {
                        description: 'The historical photograph Bernard transferred to canvas.',
                      },
                    },
                    {
                      name: 'sourceImageAltText',
                      type: 'text',
                      localized: true,
                      admin: { description: 'Alt text for the source photograph.' },
                    },
                    {
                      name: 'sourceTitle',
                      type: 'text',
                      localized: true,
                      admin: { description: 'Title as known in the archive or catalogue.' },
                    },
                    {
                      name: 'sourceCreator',
                      type: 'text',
                      admin: {
                        description: 'Photographer or institution if individual creator unknown.',
                      },
                    },
                    {
                      name: 'sourceCreatorWikidataUri',
                      type: 'text',
                      admin: { description: 'Wikidata entity for the photographer or institution.' },
                    },
                    {
                      name: 'approximateDate',
                      type: 'text',
                      admin: { description: 'Human-readable date. e.g. c. 1861 or 1895–1900.' },
                    },
                    {
                      name: 'approximateDateYear',
                      type: 'number',
                      admin: {
                        readOnly: true,
                        description: 'Earliest 4-digit year parsed from approximateDate.',
                      },
                    },
                    {
                      name: 'imageCaptureType',
                      type: 'relationship',
                      relationTo: 'image-capture-technologies',
                      admin: {
                        description:
                          'The technology used to make this source photograph. Agent proposes from date and image; Bernard confirms.',
                      },
                    },
                    {
                      name: 'sourceWikidataUri',
                      type: 'text',
                      admin: {
                        description: 'Wikidata entity for this specific photograph, if one exists.',
                      },
                    },
                    {
                      name: 'sourceWikimediaCommonsUrl',
                      type: 'text',
                      admin: { description: 'Full Wikimedia Commons file-page URL.' },
                    },
                    {
                      name: 'sourceInstitution',
                      type: 'text',
                      admin: {
                        description: 'Archive, museum, or library holding the original.',
                      },
                    },
                    {
                      name: 'sourceInstitutionWikidataUri',
                      type: 'text',
                      admin: { description: 'Wikidata entity for the holding institution.' },
                    },
                    {
                      name: 'sourceInstitutionUrl',
                      type: 'text',
                      admin: {
                        description:
                          'Direct URL to the institution catalogue record, if one exists.',
                      },
                    },
                    {
                      name: 'sourceLicense',
                      type: 'select',
                      options: [
                        { label: 'CC0', value: 'cc0' },
                        { label: 'CC BY', value: 'cc-by' },
                        { label: 'CC BY-SA', value: 'cc-by-sa' },
                        { label: 'Public domain', value: 'public-domain' },
                        { label: 'Other', value: 'other' },
                      ],
                      admin: { description: 'License under which the source photograph is used.' },
                    },
                    {
                      name: 'sourceLicenseUrl',
                      type: 'text',
                      admin: { description: 'URL to the specific license.' },
                    },
                    {
                      name: 'sourceCredit',
                      type: 'text',
                      admin: {
                        readOnly: true,
                        description:
                          'Assembled from creator, title, date, institution, license. Auto-generated.',
                      },
                    },
                  ],
                },

                // ── Group 4 — Location & Historical Context ───
                {
                  name: 'location',
                  type: 'group',
                  label: 'Location & historical context',
                  fields: [
                    {
                      name: 'locationWikidataUri',
                      type: 'text',
                      admin: {
                        description:
                          'Wikidata entity for the specific landmark depicted (not just the city).',
                      },
                    },
                    {
                      name: 'locationTGNUri',
                      type: 'text',
                      admin: {
                        description:
                          'Getty Thesaurus of Geographic Names URI. Used in JSON-LD alongside Wikidata.',
                      },
                    },
                    {
                      name: 'wikipediaUrl',
                      type: 'text',
                      localized: true,
                      admin: {
                        description:
                          'Wikipedia article for the depicted location. Localized — EN/DE editions.',
                      },
                    },
                    {
                      name: 'wikipediaExcerpt',
                      type: 'richText',
                      localized: true,
                      admin: {
                        description:
                          'Passage Bernard selects as relevant — not the article introduction. Agent presents candidates; Bernard selects.',
                      },
                    },
                    {
                      name: 'keyHistoricalDates',
                      type: 'array',
                      labels: { singular: 'Date', plural: 'Key historical dates (3–5)' },
                      fields: [
                        { name: 'year', type: 'number', required: true },
                        {
                          name: 'event',
                          type: 'text',
                          localized: true,
                          required: true,
                          admin: { description: 'Short description of the event for that year.' },
                        },
                        {
                          name: 'wikiLink',
                          type: 'text',
                          admin: {
                            description:
                              'Wikipedia article URL for this specific event or date (e.g. https://en.wikipedia.org/wiki/Fall_of_the_Berlin_Wall). Agent looks up and proposes; Bernard confirms.',
                          },
                        },
                      ],
                      admin: {
                        description:
                          'Editorial selection — not comprehensive history. Drawn out in dialogue, never drafted by agent.',
                      },
                    },
                    {
                      name: 'conceptCopy',
                      type: 'richText',
                      localized: true,
                      admin: {
                        description:
                          'Bernard contextual text. For standalone works: what drove this painting. For MoP panels: image-capture context. Never drafted by agent.',
                      },
                    },
                    {
                      name: 'fieldRecordingUrl',
                      type: 'upload',
                      relationTo: 'media',
                      admin: {
                        description:
                          'Ambient audio for the location. UI deferred post-June. Optional.',
                      },
                    },
                    {
                      name: 'fieldRecordingCredit',
                      type: 'text',
                      admin: {
                        description: "Attribution if the recording is not Bernard's own.",
                      },
                    },
                  ],
                },

                // ── Group 5 — Reveal Slider ───────────────────
                {
                  name: 'revealSlider',
                  type: 'group',
                  label: 'Reveal slider',
                  fields: [
                    {
                      name: 'transferImage',
                      type: 'upload',
                      relationTo: 'media',
                      admin: {
                        description:
                          'Canvas after photo transfer, before painted fields. Must match the crop and framing of primaryImage exactly.',
                      },
                    },
                    {
                      name: 'sliderAxis',
                      type: 'select',
                      defaultValue: 'horizontal',
                      options: [
                        { label: 'Horizontal', value: 'horizontal' },
                        { label: 'Vertical', value: 'vertical' },
                      ],
                      admin: {
                        condition: (_, sibling) => Boolean(sibling?.transferImage),
                        description:
                          'Direction of the reveal slider. Bernard chooses per painting based on painted field positions.',
                      },
                    },
                  ],
                },

                // ── Group 6 — AR Experience (schema only) ─────
                {
                  name: 'ar',
                  type: 'group',
                  label: 'AR experience',
                  admin: {
                    description:
                      'Mind.js image-target AR experience. Schema-only at launch — Art/Official does not prompt for these fields yet.',
                  },
                  fields: [
                    {
                      name: 'arEnabled',
                      type: 'checkbox',
                      defaultValue: false,
                      admin: {
                        description:
                          'Activates the AR section. Only true once at least one video and the marker file are ready.',
                      },
                    },
                    {
                      name: 'arMarkerFile',
                      type: 'upload',
                      relationTo: 'media',
                      admin: {
                        description:
                          'Compiled .mind binary for mind-ar-js. Generate at hiukim.github.io/mind-ar-js-doc/tools/compile from primaryImage.',
                      },
                    },
                    {
                      name: 'arMarkerStatus',
                      type: 'select',
                      defaultValue: 'pending',
                      options: [
                        { label: 'Pending', value: 'pending' },
                        { label: 'Generated', value: 'generated' },
                        { label: 'Failed', value: 'failed' },
                      ],
                      admin: { description: 'Set by Art/Official after successful marker upload.' },
                    },
                    {
                      name: 'arButtonColors',
                      type: 'array',
                      labels: { singular: 'Hex', plural: 'AR button colors (3)' },
                      minRows: 0,
                      maxRows: 3,
                      fields: [{ name: 'hex', type: 'text', required: true }],
                      validate: ((value: unknown) => {
                        if (value == null) return true
                        if (!Array.isArray(value)) return 'Must be an array.'
                        if (value.length !== 0 && value.length !== 3) {
                          return 'arButtonColors must contain exactly 3 hex strings.'
                        }
                        return true
                      }) as any,
                      admin: {
                        description:
                          'One colour per AR button: index 0 → Making, 1 → History, 2 → Freestyle. Pre-filled from overlayColors; Bernard may reorder.',
                      },
                    },
                    {
                      name: 'arVideos',
                      type: 'array',
                      labels: { singular: 'AR video', plural: 'AR videos (max 3)' },
                      minRows: 0,
                      maxRows: 3,
                      admin: {
                        description: 'One entry per type: making, history, freestyle.',
                      },
                      fields: [
                        {
                          name: 'type',
                          type: 'select',
                          required: true,
                          options: [
                            { label: 'Making', value: 'making' },
                            { label: 'History', value: 'history' },
                            { label: 'Freestyle', value: 'freestyle' },
                          ],
                        },
                        {
                          name: 'videoUrl',
                          type: 'upload',
                          relationTo: 'media',
                          required: true,
                        },
                        { name: 'posterImage', type: 'upload', relationTo: 'media' },
                        {
                          name: 'duration',
                          type: 'number',
                          admin: { description: 'Duration in seconds.' },
                        },
                        {
                          name: 'captions',
                          type: 'upload',
                          relationTo: 'media',
                          admin: { description: 'VTT caption file.' },
                        },
                      ],
                    },
                    {
                      name: 'historyTranscript',
                      type: 'richText',
                      localized: true,
                      admin: {
                        description:
                          'Full transcript of the History video. Never AI-generated from inference — Bernard provides or Art/Official transcribes from audio.',
                      },
                    },
                    {
                      name: 'freestyleTranscript',
                      type: 'richText',
                      localized: true,
                      admin: {
                        description: 'Full transcript of the Freestyle rap video.',
                      },
                    },
                  ],
                },

                // ── Group 7 — MoP Series (conditional) ────────
                {
                  name: 'mop',
                  type: 'group',
                  label: 'MoP series',
                  admin: {
                    condition: (data) =>
                      data?.seriesSlug === 'mediums-of-perception' ||
                      data?.seriesSlug === 'mediums-of-war',
                    description:
                      'Visible only when the artwork is in the Mediums of Perception or Mediums of War series.',
                  },
                  fields: [
                    {
                      name: 'imageCaptureType',
                      type: 'relationship',
                      relationTo: 'image-capture-technologies',
                      admin: {
                        description:
                          'Confirmed from Group 3 work — typically the same value as ach.sourcePhotograph.imageCaptureType.',
                      },
                    },
                    {
                      name: 'imageCaptureLabel',
                      type: 'text',
                      localized: true,
                      admin: {
                        description:
                          'Display label as it appears on the artwork page. e.g. "Daguerreotype, c. 1861".',
                      },
                    },
                    {
                      name: 'triptychPosition',
                      type: 'select',
                      options: [
                        { label: 'I — earliest technology', value: 'I' },
                        { label: 'II — historical print', value: 'II' },
                        { label: 'III — contemporary', value: 'III' },
                      ],
                      admin: { description: 'Panel position in the triptych.' },
                    },
                    {
                      name: 'availabilityStatus',
                      type: 'select',
                      options: [
                        { label: 'Original available', value: 'original-available' },
                        { label: 'Sold', value: 'sold' },
                        { label: 'Prints only', value: 'prints-only' },
                      ],
                      admin: {
                        description:
                          'ACH page commerce status. Distinct from base archive availabilityStatus.',
                      },
                    },
                    {
                      name: 'relatedTriptychs',
                      type: 'relationship',
                      relationTo: 'triptychs',
                      hasMany: true,
                      admin: {
                        description:
                          'Editorial links to other triptychs in the MoP series. Optional.',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },

        dcsTab,
        megacitiesTab,
      ],
    },
  ],
}
