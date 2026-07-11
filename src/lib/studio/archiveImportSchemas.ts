import { z } from 'zod'

export const visionAnalysisEntrySchema = z.object({
  text: z.string().min(1),
  model: z.string().min(1),
  date: z.string().min(1),
})

export const visionAnalysisImportSchema = z.union([
  z.object({
    slug: z.string().min(1),
    analyses: z.array(visionAnalysisEntrySchema).min(1),
  }),
  z.object({
    items: z
      .array(
        z.object({
          slug: z.string().min(1),
          analyses: z.array(visionAnalysisEntrySchema).min(1),
        }),
      )
      .min(1),
  }),
])

export const artworkFieldsImportSchema = z.union([
  z.object({
    slug: z.string().min(1),
    fields: z.record(z.string(), z.unknown()),
  }),
  z.object({
    items: z
      .array(
        z.object({
          slug: z.string().min(1),
          fields: z.record(z.string(), z.unknown()),
        }),
      )
      .min(1),
  }),
])

export type VisionAnalysisImportInput = z.infer<typeof visionAnalysisImportSchema>
export type ArtworkFieldsImportInput = z.infer<typeof artworkFieldsImportSchema>

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
