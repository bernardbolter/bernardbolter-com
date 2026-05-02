import { CollectionConfig } from 'payload'

import { privateFieldAccess, publicReadStaffWriteAccess } from '@/access/isArtistOrAdmin'
import { artworkBeforeChange } from '@/hooks/artworkBeforeChange'

export const Artworks: CollectionConfig = {
  slug: 'artworks',
  hooks: {
    beforeChange: [artworkBeforeChange],
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'series', 'yearCreated', 'isForSale'],
    description: 'The complete archive of all artworks.',
  },
  fields: [
    // ── Always visible: primary media (§1.5) ───────────────────
    {
      name: 'primaryImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Canonical high-res image for image-based works.',
      },
    },
    {
      name: 'primaryMediaType',
      type: 'select',
      defaultValue: 'image',
      options: [
        { label: 'Image', value: 'image' },
        { label: 'Video', value: 'video' },
        { label: 'Image and video', value: 'image-and-video' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'primaryImageAltText',
      type: 'text',
      localized: true,
      admin: {
        description: 'Alt text for the primary image (accessibility).',
      },
    },
    {
      name: 'posterImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description:
          'Thumbnail / social / timeline / video poster. Required when primary media type is video.',
      },
    },
    {
      name: 'posterImageAltText',
      type: 'text',
      localized: true,
    },
    {
      name: 'wpImageUrl',
      type: 'text',
      admin: {
        description: 'Temporary WordPress image URL until migrated to R2.',
        position: 'sidebar',
      },
    },

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
              name: 'slug',
              type: 'text',
              required: true,
              unique: true,
            },
            {
              name: 'creator',
              type: 'relationship',
              relationTo: 'people',
              required: true,
              filterOptions: { role: { contains: 'artist' } },
              admin: { position: 'sidebar' },
            },
            {
              name: 'series',
              type: 'relationship',
              relationTo: 'series',
              hasMany: false,
              required: true,
              admin: { position: 'sidebar' },
            },
            {
              // auto-populated from series, drives tab visibility
              name: 'seriesSlug',
              type: 'text',
              admin: {
                readOnly: true,
                position: 'sidebar',
                description: 'Auto-set from series.',
              },
              hooks: {
                beforeChange: [
                  async ({ siblingData, req }) => {
                    if (!siblingData?.series) return null
                    const s = await req.payload.findByID({
                      collection: 'series',
                      id: siblingData.series,
                    })
                    return s?.slug ?? null
                  },
                ],
              },
            },
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
              admin: { position: 'sidebar' },
            },
            {
              name: 'yearCreated',
              type: 'number',
              required: true,
              admin: {
                position: 'sidebar',
                description: 'Four-digit year the work was begun.',
              },
            },
            {
              name: 'yearCompleted',
              type: 'number',
              admin: {
                position: 'sidebar',
                description: 'Year finished if different from year created.',
              },
            },
            {
              name: 'yearStart',
              type: 'number',
              admin: {
                position: 'sidebar',
                readOnly: true,
                description: 'Mirrors year created — reserved for future slug generation.',
              },
            },
            {
              name: 'datePublished',
              type: 'date',
              admin: { position: 'sidebar' },
            },
            {
              name: 'wp_id',
              type: 'number',
              admin: {
                position: 'sidebar',
                description: 'Legacy WordPress ID.',
              },
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
              type: 'select',
              required: true,
              options: [
                {
                  label: 'Acrylic photo transfer on canvas',
                  value: 'acrylic-photo-transfer-on-canvas',
                },
                { label: 'Acrylic on canvas', value: 'acrylic-on-canvas' },
                { label: 'Mixed media on canvas', value: 'mixed-media-on-canvas' },
                { label: 'Photo collage', value: 'photo-collage' },
                { label: 'Video', value: 'video' },
                { label: 'Digital', value: 'digital' },
                { label: 'Other', value: 'other' },
              ],
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
                description: 'CLIP embedding stored as vector(1536); use SQL/API for similarity, not this cell.',
              },
              custom: { dbType: 'vector(1536)' },
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
              admin: { description: 'Verso, installation angles, raking light, etc.' },
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
                description: 'Primary embeddable URL (YouTube, Vimeo, …). Cleared when videoFile is set.',
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
                  name: 'holderPerson',
                  type: 'relationship',
                  relationTo: 'people',
                  admin: {
                    condition: (data) => data?.artworkHolder?.holderType === 'Person',
                  },
                },
                {
                  name: 'holderName',
                  type: 'text',
                  admin: { description: 'If not in People collection.' },
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
              access: privateFieldAccess,
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
              access: privateFieldAccess,
              admin: {
                description:
                  'JSON array: { transactionId, ownerPrivate, displayName, city, dateAcquired, dateRelinquished, claimStatus, collectorVisible, notes }. Link sales via transactionId.',
              },
            },
            {
              name: 'loanHistory',
              type: 'json',
              access: privateFieldAccess,
              admin: {
                description:
                  'JSON array: { institution, dateOut, dateReturned, eventId (numeric id → events), notes }.',
              },
            },
            {
              name: 'provenanceConfidenceLayer',
              type: 'json',
              access: privateFieldAccess,
              admin: {
                description:
                  'JSON array: { claim, evidenceBasis, confidenceLevel: documented-fact | credible-inference | institutional-assertion | speculation }.',
              },
            },
          ],
        },

        // ── TAB 8: Exhibitions (legacy) ────────────────────────────────
        {
          label: 'Exhibitions',
          admin: {
            description:
              'Legacy WordPress-era relation. Canonical CV/show history: **Events** collection — add this work on each Event (Artworks tab); it appears under Classification → Events automatically.',
          },
          fields: [
            {
              name: 'exhibitions',
              type: 'relationship',
              relationTo: 'exhibitions',
              hasMany: true,
              admin: {
                description: 'Legacy only. Prefer Event → Artworks + Artwork → Classification → Events.',
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
              access: privateFieldAccess,
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
              access: privateFieldAccess,
              admin: { description: "Gallery inventory / stock id (private)." },
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
                position: 'sidebar',
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
            { name: 'metaTitle', type: 'text', localized: true },
            { name: 'metaDescription', type: 'textarea', localized: true },
            {
              name: 'sameAs',
              type: 'array',
              fields: [
                { name: 'url', type: 'text', required: true },
                { name: 'label', type: 'text' },
              ],
            },
          ],
        },

        // ── TAB 11: A Colorful History ────────────────────────
        {
          label: 'A Colorful History',
          admin: {
            condition: (data) => data?.seriesSlug === 'a-colorful-history',
          },
          fields: [
            {
              name: 'ach_historyText',
              type: 'richText',
              localized: true,
              admin: { description: 'Historical context for AR/app.' },
            },
            {
              name: 'ach_freestyleText',
              type: 'richText',
              localized: true,
            },
            { name: 'ach_wikiLinkEn', type: 'text', label: 'Wikipedia (EN)' },
            { name: 'ach_wikiLinkDe', type: 'text', label: 'Wikipedia (DE)' },
            {
              name: 'ach_arEnabled',
              type: 'checkbox',
              defaultValue: false,
              label: 'AR Enhancement enabled',
            },
            {
              name: 'ach_arVideos',
              type: 'array',
              admin: {
                condition: (data) => Boolean(data?.ach_arEnabled),
              },
              fields: [
                {
                  name: 'videoRole',
                  type: 'select',
                  required: true,
                  options: [
                    { label: 'Making Of', value: 'makingOf' },
                    { label: 'History', value: 'history' },
                    { label: 'Freestyle', value: 'freestyle' },
                    { label: 'Other', value: 'other' },
                  ],
                },
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
                  admin: { condition: (_, s) => s?.videoType === 'upload' },
                },
                {
                  name: 'videoUrl',
                  type: 'text',
                  admin: { condition: (_, s) => s?.videoType !== 'upload' },
                },
                { name: 'posterImage', type: 'upload', relationTo: 'media' },
                { name: 'title', type: 'text', localized: true },
              ],
            },
          ],
        },

        // ── TAB 12: Digital City Series ───────────────────────
        {
          label: 'Digital City Series',
          admin: {
            condition: (data) => data?.seriesSlug === 'digital-city-series',
          },
          fields: [
            { name: 'dcs_photoTitle', type: 'text', label: 'Original Photo Title' },
            {
              name: 'dcs_cityData',
              type: 'group',
              fields: [
                { name: 'population', type: 'number' },
                { name: 'area', type: 'number', admin: { description: 'km²' } },
                { name: 'density', type: 'number', admin: { description: 'per km²' } },
                { name: 'elevation', type: 'number', admin: { description: 'metres' } },
              ],
            },
            {
              name: 'dcs_videos',
              type: 'array',
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
                  admin: { condition: (_, s) => s?.videoType === 'upload' },
                },
                {
                  name: 'videoUrl',
                  type: 'text',
                  admin: { condition: (_, s) => s?.videoType !== 'upload' },
                },
                { name: 'posterImage', type: 'upload', relationTo: 'media' },
                { name: 'title', type: 'text', localized: true },
                {
                  name: 'videoRole',
                  type: 'select',
                  options: [
                    { label: 'Making Of', value: 'makingOf' },
                    { label: 'Documentation', value: 'documentation' },
                    { label: 'Other', value: 'other' },
                  ],
                },
              ],
            },
          ],
        },

        // ── TAB 13: Megacities ────────────────────────────────
        {
          label: 'Megacities',
          admin: {
            condition: (data) => data?.seriesSlug === 'megacities',
          },
          fields: [
            {
              name: 'mc_cityData',
              type: 'group',
              fields: [
                { name: 'population', type: 'number' },
                { name: 'area', type: 'number', admin: { description: 'km²' } },
                { name: 'density', type: 'number', admin: { description: 'per km²' } },
                { name: 'elevation', type: 'number', admin: { description: 'metres' } },
              ],
            },
            {
              name: 'mc_videos',
              type: 'array',
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
                  admin: { condition: (_, s) => s?.videoType === 'upload' },
                },
                {
                  name: 'videoUrl',
                  type: 'text',
                  admin: { condition: (_, s) => s?.videoType !== 'upload' },
                },
                { name: 'posterImage', type: 'upload', relationTo: 'media' },
                { name: 'title', type: 'text', localized: true },
                {
                  name: 'videoRole',
                  type: 'select',
                  options: [
                    { label: 'Making Of', value: 'makingOf' },
                    { label: 'Documentation', value: 'documentation' },
                    { label: 'Other', value: 'other' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
