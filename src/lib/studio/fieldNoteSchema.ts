import { z } from 'zod'

export const fieldNoteMediaTypes = [
  'text',
  'photo',
  'video-broll',
  'video-observation',
  'video-performance',
  'video-process',
  'voice-memo',
] as const

export const fieldNoteRegisters = [
  'exploratory',
  'resolved',
  'frustrated',
  'excited',
  'observational',
] as const

export const fieldNoteProcessStages = ['early', 'mid', 'late', 'completed'] as const

export const fieldNoteConceptualThreads = [
  'daguerreotype',
  'wet-plate',
  'aerial',
  'digital',
  'layering',
  'light-quality',
  'historical-angle',
] as const

const locationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
})

export const createFieldNoteSchema = z
  .object({
    mediaType: z.enum(fieldNoteMediaTypes),
    mediaFileId: z.number().int().positive().optional(),
    writtenNote: z.string().optional(),
    city: z.string().optional(),
    locationName: z.string().optional(),
    location: locationSchema.optional(),
    capturedAt: z.string().optional(),
    relatedArtwork: z.number().int().positive().optional(),
    relatedEpisode: z.number().int().positive().optional(),
    lines: z.array(z.number().int().positive()).optional(),
    register: z.enum(fieldNoteRegisters).optional(),
    processStage: z.enum(fieldNoteProcessStages).optional(),
    conceptualThread: z.enum(fieldNoteConceptualThreads).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mediaType !== 'text' && data.mediaFileId == null) {
      ctx.addIssue({
        code: 'custom',
        message: 'mediaFileId is required unless mediaType is text',
        path: ['mediaFileId'],
      })
    }
    if (data.mediaType === 'text' && !data.writtenNote?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'writtenNote is required for text field notes',
        path: ['writtenNote'],
      })
    }
  })

export type CreateFieldNoteInput = z.infer<typeof createFieldNoteSchema>
