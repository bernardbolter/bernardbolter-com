import { z } from 'zod'

export const visionAnalysisEntrySchema = z
  .object({
    text: z.string().min(1),
    model: z.string().min(1),
    date: z.string().min(1),
  })
  .strict()

const visionSingleSchema = z
  .object({
    slug: z.string().min(1),
    analyses: z.array(visionAnalysisEntrySchema).min(1),
  })
  .strict()

const visionBatchItemSchema = z
  .object({
    slug: z.string().min(1),
    analyses: z.array(visionAnalysisEntrySchema).min(1),
  })
  .strict()

const visionBatchSchema = z
  .object({
    items: z.array(visionBatchItemSchema).min(1),
  })
  .strict()

export const visionAnalysisImportSchema = z.union([visionSingleSchema, visionBatchSchema])

const artworkFieldsSingleSchema = z
  .object({
    slug: z.string().min(1),
    fields: z.record(z.string(), z.unknown()),
  })
  .strict()

const artworkFieldsBatchItemSchema = z
  .object({
    slug: z.string().min(1),
    fields: z.record(z.string(), z.unknown()),
  })
  .strict()

const artworkFieldsBatchSchema = z
  .object({
    items: z.array(artworkFieldsBatchItemSchema).min(1),
  })
  .strict()

export const artworkFieldsImportSchema = z.union([
  artworkFieldsSingleSchema,
  artworkFieldsBatchSchema,
])

const bioTimelineEntrySchema = z
  .object({
    eventDate: z.string().optional(),
    text: z.string().min(1),
    sourceSessionRef: z.union([z.string(), z.number()]).optional(),
    linkedArtworkSlugs: z.array(z.string()).optional(),
    visibility: z.enum(['public', 'private']).optional(),
  })
  .strict()

const statementThroughlineEntrySchema = z
  .object({
    dateRecognized: z.string().optional(),
    text: z.string().min(1),
    sourceSessionRef: z.union([z.string(), z.number()]).optional(),
    linkedArtworkSlugs: z.array(z.string()).optional(),
    visibility: z.enum(['public', 'private']).optional(),
  })
  .strict()

/** Envelope shorthand + live Payload sessionType values. */
export const envelopeSessionTypeSchema = z.enum([
  'artwork',
  'statement',
  'event',
  'artwork-cataloguing',
  'artist-statement',
  'event-enrichment',
])

const sessionMessageSchema = z
  .object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })
  .strict()

const sessionProposedAbstractSchema = z
  .object({
    targetCollection: z.enum(['bio-timeline', 'statement-throughline']),
    text: z.string().min(1),
    status: z.enum(['proposed', 'accepted', 'edited', 'rejected']),
  })
  .strict()

const sessionFieldsSchema = z
  .object({
    sessionType: envelopeSessionTypeSchema,
    primaryArtwork: z.string().min(1).optional(),
    mentionedArtworks: z.array(z.string().min(1)).optional(),
    status: z.enum(['in-progress', 'completed']),
    firstImpression: z.string().optional(),
    secondDescription: z.string().optional(),
    proposedAbstracts: z.array(sessionProposedAbstractSchema).optional(),
    sessionNotes: z.string().optional(),
    messages: z.array(sessionMessageSchema),
  })
  .strict()

export const envelopeWriteSchema = z.discriminatedUnion('collection', [
  z
    .object({
      collection: z.literal('artworks'),
      slug: z.string().min(1),
      operation: z.literal('set').optional(),
      fields: z.record(z.string(), z.unknown()),
    })
    .strict(),
  z
    .object({
      collection: z.literal('bio-timeline'),
      operation: z.literal('append'),
      entry: bioTimelineEntrySchema,
    })
    .strict(),
  z
    .object({
      collection: z.literal('statement-throughlines'),
      operation: z.literal('append'),
      entry: statementThroughlineEntrySchema,
    })
    .strict(),
  z
    .object({
      collection: z.literal('sessions'),
      operation: z.literal('set'),
      sessionId: z.string().min(1),
      fields: sessionFieldsSchema,
    })
    .strict(),
])

export const envelopeImportSchema = z
  .object({
    sourceSessionRef: z.union([z.string(), z.number()]).optional(),
    writes: z.array(envelopeWriteSchema).min(1),
  })
  .strict()

export type VisionAnalysisImportInput = z.infer<typeof visionAnalysisImportSchema>
export type ArtworkFieldsImportInput = z.infer<typeof artworkFieldsImportSchema>
export type EnvelopeImportInput = z.infer<typeof envelopeImportSchema>
export type EnvelopeWrite = z.infer<typeof envelopeWriteSchema>

/** Map envelope sessionType shorthand → live Sessions.sessionType values. */
export function mapEnvelopeSessionType(
  value: z.infer<typeof envelopeSessionTypeSchema>,
): 'artwork-cataloguing' | 'artist-statement' | 'event-enrichment' {
  switch (value) {
    case 'artwork':
    case 'artwork-cataloguing':
      return 'artwork-cataloguing'
    case 'statement':
    case 'artist-statement':
      return 'artist-statement'
    case 'event':
    case 'event-enrichment':
      return 'event-enrichment'
    default: {
      const _exhaustive: never = value
      return _exhaustive
    }
  }
}

/**
 * Sessions writes must run before bio-timeline / statement-throughlines that may
 * reference a sessionId created in the same paste. Relative order within each
 * group is preserved.
 */
export function orderEnvelopeWrites<T extends { collection: string }>(writes: T[]): T[] {
  const sessions: T[] = []
  const rest: T[] = []
  for (const write of writes) {
    if (write.collection === 'sessions') sessions.push(write)
    else rest.push(write)
  }
  return [...sessions, ...rest]
}

export function normalizeVisionImportItems(
  input: VisionAnalysisImportInput,
): Array<{ slug: string; analyses: z.infer<typeof visionAnalysisEntrySchema>[] }> {
  if ('items' in input) return input.items
  return [{ slug: input.slug, analyses: input.analyses }]
}

export function normalizeArtworkFieldsImportItems(
  input: ArtworkFieldsImportInput,
): Array<{ slug: string; fields: Record<string, unknown> }> {
  if ('items' in input) return input.items
  return [{ slug: input.slug, fields: input.fields }]
}
