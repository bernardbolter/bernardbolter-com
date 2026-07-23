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
