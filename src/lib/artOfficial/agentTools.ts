import { z } from 'zod'

import type { Tool } from '@anthropic-ai/sdk/resources/messages/messages'

import { PRACTICE_KNOWLEDGE_SLUGS } from './practiceKnowledgeSlugs'

export const TOOL_UPDATE_FIELD = 'update_field'
export const TOOL_STORE_SESSION_FIELD = 'store_session_field'
export const TOOL_TRIGGER_IMAGE_ANALYSIS = 'trigger_image_analysis'
export const TOOL_GENERATE_CONFIRMATION_DRAFT = 'generate_confirmation_draft'
export const TOOL_FLAG_WEAK_PHASE = 'flag_weak_phase'
export const TOOL_ASSESS_FORMAL_CONTRIBUTION = 'assess_formal_contribution'
export const TOOL_LOOKUP_COMMONS_FILE = 'lookup_commons_file'
export const TOOL_SEARCH_WIKIDATA = 'search_wikidata'
export const TOOL_GET_WIKIDATA_ENTITY = 'get_wikidata_entity'
export const TOOL_FETCH_WIKIPEDIA_ARTICLE = 'fetch_wikipedia_article'
export const TOOL_SEARCH_GETTY_TGN = 'search_getty_tgn'
export const TOOL_GET_MEDIA_UPLOAD_STATUS = 'get_media_upload_status'
export const TOOL_LOOKUP_LEGACY_RECORD = 'lookup_legacy_record'
export const TOOL_LIST_LEGACY_RECORDS = 'list_legacy_records'
export const TOOL_PLACE_IN_SEQUENCE = 'place_in_sequence'
export const TOOL_SET_DATE_ANCHOR = 'set_date_anchor'
export const TOOL_LINK_MEDIA_TO_SLOT = 'link_media_to_slot'

const targetCollectionSchema = z.enum([
  'artworks',
  'artists',
  'events',
  'episodes',
  'practice-knowledge',
  'triptychs',
])

const practiceKnowledgeSlugSchema = z.enum(PRACTICE_KNOWLEDGE_SLUGS)

export const updateFieldSchema = z
  .object({
    targetCollection: targetCollectionSchema,
    field: z.string().min(1),
    value: z.unknown(),
    confidence: z.enum(['confirmed', 'inferred']),
    source: z.enum(['conversation', 'image-analysis', 'knowledge-base']),
  })
  .superRefine((data, ctx) => {
    if (data.targetCollection !== 'practice-knowledge') return

    const slug = practiceKnowledgeSlugSchema.safeParse(data.field)
    if (!slug.success) {
      ctx.addIssue({
        code: 'custom',
        path: ['field'],
        message: `Must be a practice-knowledge slug: ${PRACTICE_KNOWLEDGE_SLUGS.join(', ')}`,
      })
    }

    if (typeof data.value !== 'string' || !data.value.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['value'],
        message: 'Must be a non-empty plain-text string (prose for that section)',
      })
    }
  })

export const storeSessionFieldSchema = z
  .object({
    field: z.enum([
      'firstImpression',
      'secondDescription',
      'sessionNotes',
      'preUploadStep',
      'highlightedMediaSlot',
    ]),
    value: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.field === 'preUploadStep' && !/^[1-4]$/.test(data.value.trim())) {
      ctx.addIssue({
        code: 'custom',
        path: ['value'],
        message: 'preUploadStep must be "1", "2", "3", or "4"',
      })
    }
    if (data.field === 'highlightedMediaSlot' && !data.value.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['value'],
        message: 'highlightedMediaSlot must be a non-empty slot id',
      })
    }
  })

export const triggerImageAnalysisSchema = z.object({
  mediaId: z.number().int().positive(),
})

export const generateConfirmationDraftSchema = z.object({
  agentDraftDescriptionShort: z.string(),
  agentDraftDescriptionLong: z.string(),
  agentDraftConceptualKeywords: z.array(z.string()),
  agentDraftFormalContributionAssessment: z.string(),
})

export const flagWeakPhaseSchema = z.object({
  phase: z.enum([
    'pre-upload',
    'identity',
    'intent',
    'art-historical',
    'classification',
    'confirmation',
  ]),
  note: z.string().optional(),
})

export const assessFormalContributionSchema = z.object({
  accuracy: z.enum(['accurate', 'partial', 'missed']),
  notes: z.string(),
})

export const lookupCommonsFileSchema = z.object({
  commonsUrl: z.string().url(),
})

export const searchWikidataSchema = z.object({
  query: z.string().min(1),
  language: z.enum(['en', 'de']).optional(),
  limit: z.number().int().min(1).max(10).optional(),
})

export const getWikidataEntitySchema = z.object({
  entityId: z.string().min(1),
  language: z.enum(['en', 'de']).optional(),
})

export const fetchWikipediaArticleSchema = z.object({
  url: z.string().url().optional(),
  title: z.string().min(1).optional(),
  locale: z.enum(['en', 'de']).optional(),
})

export const searchGettyTgnSchema = z.object({
  placeName: z.string().min(1),
  limit: z.number().int().min(1).max(10).optional(),
})

export const getMediaUploadStatusSchema = z.object({})

export const lookupLegacyRecordSchema = z.object({
  query: z.string().min(1),
  series: z.string().optional(),
  storeOnSession: z.boolean().optional(),
})

export const listLegacyRecordsSchema = z.object({
  series: z.string().optional(),
})

export const placeInSequenceSchema = z.object({
  beforeSlug: z.string().min(1).optional(),
  afterSlug: z.string().min(1).optional(),
  artworkSlug: z.string().min(1).optional(),
})

export const setDateAnchorSchema = z.object({
  date: z.string().min(1),
  precision: z.enum(['exact', 'month', 'year', 'circa', 'decade', 'unknown']),
  artworkSlug: z.string().min(1).optional(),
})

export const linkMediaToSlotSchema = z.object({
  slotId: z.string().min(1),
  mediaId: z.number().int().positive(),
})

const toolSchemas: Record<string, z.ZodType> = {
  [TOOL_UPDATE_FIELD]: updateFieldSchema,
  [TOOL_STORE_SESSION_FIELD]: storeSessionFieldSchema,
  [TOOL_TRIGGER_IMAGE_ANALYSIS]: triggerImageAnalysisSchema,
  [TOOL_GENERATE_CONFIRMATION_DRAFT]: generateConfirmationDraftSchema,
  [TOOL_FLAG_WEAK_PHASE]: flagWeakPhaseSchema,
  [TOOL_ASSESS_FORMAL_CONTRIBUTION]: assessFormalContributionSchema,
  [TOOL_LOOKUP_COMMONS_FILE]: lookupCommonsFileSchema,
  [TOOL_SEARCH_WIKIDATA]: searchWikidataSchema,
  [TOOL_GET_WIKIDATA_ENTITY]: getWikidataEntitySchema,
  [TOOL_FETCH_WIKIPEDIA_ARTICLE]: fetchWikipediaArticleSchema,
  [TOOL_SEARCH_GETTY_TGN]: searchGettyTgnSchema,
  [TOOL_GET_MEDIA_UPLOAD_STATUS]: getMediaUploadStatusSchema,
  [TOOL_LOOKUP_LEGACY_RECORD]: lookupLegacyRecordSchema,
  [TOOL_LIST_LEGACY_RECORDS]: listLegacyRecordsSchema,
  [TOOL_PLACE_IN_SEQUENCE]: placeInSequenceSchema,
  [TOOL_SET_DATE_ANCHOR]: setDateAnchorSchema,
  [TOOL_LINK_MEDIA_TO_SLOT]: linkMediaToSlotSchema,
}

export type ParseToolResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export function parseToolArgs<T = unknown>(
  toolName: string,
  raw: unknown,
): ParseToolResult<T> {
  const schema = toolSchemas[toolName]
  if (!schema) {
    return { ok: false, error: `Unknown tool: ${toolName}` }
  }
  const result = schema.safeParse(raw)
  if (!result.success) {
    const error = result.error.issues
      .map((issue) => {
        const path = issue.path.length ? issue.path.join('.') : 'input'
        return `${path}: ${issue.message}`
      })
      .join('; ')
    return { ok: false, error: error || result.error.message }
  }
  return { ok: true, data: result.data as T }
}

export const ANTHROPIC_TOOL_SCHEMAS: Tool[] = [
  {
    name: TOOL_UPDATE_FIELD,
    description:
      'Stage a field value for later commit. For practice-knowledge (onboarding), set field to the section slug and value to plain-text prose. For artworks, field accepts dotted Payload paths into groups, e.g. "ach.overlay.overlayColors" or "ach.location.locationWikidataUri".',
    input_schema: {
      type: 'object',
      properties: {
        targetCollection: {
          type: 'string',
          enum: ['artworks', 'artists', 'events', 'episodes', 'practice-knowledge', 'triptychs'],
        },
        field: {
          type: 'string',
          description:
            'Payload field name. Artworks support dotted paths into groups (e.g. "ach.sourcePhotograph.sourceTitle"). Artists/events use a top-level field name. Practice-knowledge uses one of: series, visual-vocabulary, art-historical-touchstones, preferred-vocabulary, biography, artist-statement.',
        },
        value: {
          description:
            'Field value. For practice-knowledge use a non-empty plain-text string. For rich-text artwork fields (e.g. ach.location.wikipediaExcerpt, ach.location.conceptCopy, ach.mapAndTour.tourStopCopy) pass plain-text prose — the server converts to Lexical at commit.',
        },
        confidence: { type: 'string', enum: ['confirmed', 'inferred'] },
        source: {
          type: 'string',
          enum: ['conversation', 'image-analysis', 'knowledge-base'],
        },
      },
      required: ['targetCollection', 'field', 'value', 'confidence', 'source'],
    },
  },
  {
    name: TOOL_STORE_SESSION_FIELD,
    description:
      'Store a value on the session record only (not on Artworks). preUploadStep is tracked by the server — only set it when moving forward. Use firstImpression for the blind description. Use highlightedMediaSlot with a media slot id (e.g. ach-source) to highlight a row in the Media uploads panel.',
    input_schema: {
      type: 'object',
      properties: {
        field: {
          type: 'string',
          enum: [
            'firstImpression',
            'secondDescription',
            'sessionNotes',
            'preUploadStep',
            'highlightedMediaSlot',
          ],
        },
        value: { type: 'string' },
      },
      required: ['field', 'value'],
    },
  },
  {
    name: TOOL_TRIGGER_IMAGE_ANALYSIS,
    description: 'Trigger silent image analysis after upload.',
    input_schema: {
      type: 'object',
      properties: { mediaId: { type: 'number' } },
      required: ['mediaId'],
    },
  },
  {
    name: TOOL_GENERATE_CONFIRMATION_DRAFT,
    description: 'Generate confirmation-step drafts at session end.',
    input_schema: {
      type: 'object',
      properties: {
        agentDraftDescriptionShort: { type: 'string' },
        agentDraftDescriptionLong: { type: 'string' },
        agentDraftConceptualKeywords: { type: 'array', items: { type: 'string' } },
        agentDraftFormalContributionAssessment: { type: 'string' },
      },
      required: [
        'agentDraftDescriptionShort',
        'agentDraftDescriptionLong',
        'agentDraftConceptualKeywords',
        'agentDraftFormalContributionAssessment',
      ],
    },
  },
  {
    name: TOOL_FLAG_WEAK_PHASE,
    description: 'Flag a dialogue phase that produced thin material.',
    input_schema: {
      type: 'object',
      properties: {
        phase: {
          type: 'string',
          enum: [
            'pre-upload',
            'identity',
            'intent',
            'art-historical',
            'classification',
            'confirmation',
          ],
        },
        note: { type: 'string' },
      },
      required: ['phase'],
    },
  },
  {
    name: TOOL_ASSESS_FORMAL_CONTRIBUTION,
    description: 'Record accuracy of the formal contribution assessment draft.',
    input_schema: {
      type: 'object',
      properties: {
        accuracy: { type: 'string', enum: ['accurate', 'partial', 'missed'] },
        notes: { type: 'string' },
      },
      required: ['accuracy', 'notes'],
    },
  },
  {
    name: TOOL_LOOKUP_COMMONS_FILE,
    description:
      'Fetch structured metadata from a Wikimedia Commons File: page URL (title, artist, license, date, linked Wikidata id).',
    input_schema: {
      type: 'object',
      properties: { commonsUrl: { type: 'string' } },
      required: ['commonsUrl'],
    },
  },
  {
    name: TOOL_SEARCH_WIKIDATA,
    description: 'Search Wikidata for entities by label (landmarks, creators, institutions).',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        language: { type: 'string', enum: ['en', 'de'] },
        limit: { type: 'number' },
      },
      required: ['query'],
    },
  },
  {
    name: TOOL_GET_WIKIDATA_ENTITY,
    description:
      'Fetch a Wikidata entity summary by Q-id (label, description, Wikipedia URL, coordinates, inception year).',
    input_schema: {
      type: 'object',
      properties: {
        entityId: { type: 'string', description: 'Q-number, e.g. Q82425' },
        language: { type: 'string', enum: ['en', 'de'] },
      },
      required: ['entityId'],
    },
  },
  {
    name: TOOL_FETCH_WIKIPEDIA_ARTICLE,
    description:
      'Fetch Wikipedia intro and section excerpt candidates for location context (present 4–6 to the artist).',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        title: { type: 'string' },
        locale: { type: 'string', enum: ['en', 'de'] },
      },
    },
  },
  {
    name: TOOL_SEARCH_GETTY_TGN,
    description: 'Search Getty TGN for a geographic name URI (ach.location.locationTGNUri).',
    input_schema: {
      type: 'object',
      properties: {
        placeName: { type: 'string' },
        limit: { type: 'number' },
      },
      required: ['placeName'],
    },
  },
  {
    name: TOOL_GET_MEDIA_UPLOAD_STATUS,
    description:
      'List artwork media upload slots and whether each is pending, staged, or skipped (artwork-cataloguing sessions).',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: TOOL_LOOKUP_LEGACY_RECORD,
    description:
      'Read-only lookup against the frozen WordPress legacy dump (data/legacy/wp-artworks.json). Match by databaseId, slug, or title. Returns normalised facts to cross-check with the artist — never auto-writes to Artworks. Lead with conflicts. Set storeOnSession true after the artist confirms the match.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'databaseId, slug fragment, or title fragment' },
        series: { type: 'string', description: 'Optional series slug filter' },
        storeOnSession: {
          type: 'boolean',
          description: 'When true and a single match is confirmed, store legacyRecordId on this session.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: TOOL_LIST_LEGACY_RECORDS,
    description:
      'Browse legacy WordPress records from the local dump when title/slug search is ambiguous. Read-only.',
    input_schema: {
      type: 'object',
      properties: {
        series: { type: 'string', description: 'Optional series slug filter' },
      },
    },
  },
  {
    name: TOOL_PLACE_IN_SEQUENCE,
    description:
      'Stage sortIndex for an artwork by inserting between neighbours. afterSlug = place after that work; beforeSlug = place before that work. Provide one or both. Does not renumber other works — uses float midpoint.',
    input_schema: {
      type: 'object',
      properties: {
        afterSlug: { type: 'string', description: 'Slug of the work that should come before the target' },
        beforeSlug: { type: 'string', description: 'Slug of the work that should come after the target' },
        artworkSlug: { type: 'string', description: 'Target artwork slug (required in multi-work sequencing sessions)' },
      },
    },
  },
  {
    name: TOOL_SET_DATE_ANCHOR,
    description:
      'Stage a known date anchor (dateKnown + datePrecision) for timeline interpolation. Never invent dates — only after artist confirmation.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'ISO date YYYY-MM-DD' },
        precision: {
          type: 'string',
          enum: ['exact', 'month', 'year', 'circa', 'decade', 'unknown'],
        },
        artworkSlug: { type: 'string', description: 'Target artwork slug when sequencing multiple works' },
      },
      required: ['date', 'precision'],
    },
  },
  {
    name: TOOL_LINK_MEDIA_TO_SLOT,
    description:
      'Link an existing Payload media record to an artwork media slot (no re-upload). Use when the artist says the file is already in the Media library — ask for the media id if needed, or use the id from list context. Runs vision analysis for image slots.',
    input_schema: {
      type: 'object',
      properties: {
        slotId: {
          type: 'string',
          description:
            'Media slot id, e.g. ach-source, ach-transfer, detail, work-view, poster',
        },
        mediaId: { type: 'number', description: 'Numeric id from the Media collection' },
      },
      required: ['slotId', 'mediaId'],
    },
  },
]
