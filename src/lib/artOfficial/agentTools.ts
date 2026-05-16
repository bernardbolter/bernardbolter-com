import { z } from 'zod'

import type { Tool } from '@anthropic-ai/sdk/resources/messages/messages'

export const TOOL_UPDATE_FIELD = 'update_field'
export const TOOL_STORE_SESSION_FIELD = 'store_session_field'
export const TOOL_TRIGGER_IMAGE_ANALYSIS = 'trigger_image_analysis'
export const TOOL_GENERATE_CONFIRMATION_DRAFT = 'generate_confirmation_draft'
export const TOOL_FLAG_WEAK_PHASE = 'flag_weak_phase'
export const TOOL_ASSESS_FORMAL_CONTRIBUTION = 'assess_formal_contribution'

const targetCollectionSchema = z.enum(['artworks', 'artists', 'events'])

export const updateFieldSchema = z.object({
  targetCollection: targetCollectionSchema,
  field: z.string().min(1),
  value: z.unknown(),
  confidence: z.enum(['confirmed', 'inferred']),
  source: z.enum(['conversation', 'image-analysis', 'knowledge-base']),
})

export const storeSessionFieldSchema = z.object({
  field: z.enum(['firstImpression', 'secondDescription', 'sessionNotes']),
  value: z.string(),
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

const toolSchemas: Record<string, z.ZodType> = {
  [TOOL_UPDATE_FIELD]: updateFieldSchema,
  [TOOL_STORE_SESSION_FIELD]: storeSessionFieldSchema,
  [TOOL_TRIGGER_IMAGE_ANALYSIS]: triggerImageAnalysisSchema,
  [TOOL_GENERATE_CONFIRMATION_DRAFT]: generateConfirmationDraftSchema,
  [TOOL_FLAG_WEAK_PHASE]: flagWeakPhaseSchema,
  [TOOL_ASSESS_FORMAL_CONTRIBUTION]: assessFormalContributionSchema,
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
    return { ok: false, error: result.error.message }
  }
  return { ok: true, data: result.data as T }
}

export const ANTHROPIC_TOOL_SCHEMAS: Tool[] = [
  {
    name: TOOL_UPDATE_FIELD,
    description:
      'Stage a field value for later commit. Does not write to artworks or artists directly.',
    input_schema: {
      type: 'object',
      properties: {
        targetCollection: { type: 'string', enum: ['artworks', 'artists', 'events'] },
        field: { type: 'string', description: 'Exact Payload field name' },
        value: { description: 'Field value matching the field type' },
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
    description: 'Store a value on the session record only (not on Artworks).',
    input_schema: {
      type: 'object',
      properties: {
        field: {
          type: 'string',
          enum: ['firstImpression', 'secondDescription', 'sessionNotes'],
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
]
