import type { Payload, Where } from 'payload'

import type { FieldNote, User } from '@/payload-types'

export type FieldNoteListFilters = {
  mediaType?: string
  untagged?: boolean
  city?: string
  artworkId?: number
  episodeId?: number
  lineId?: number
  register?: string
  processStage?: string
  conceptualThread?: string
  from?: string
  to?: string
}

export function buildFieldNoteWhere(filters: FieldNoteListFilters): Where {
  const and: Where[] = []

  if (filters.mediaType) {
    and.push({ mediaType: { equals: filters.mediaType } })
  }
  if (filters.untagged) {
    and.push({
      and: [{ relatedArtwork: { exists: false } }, { relatedEpisode: { exists: false } }],
    })
  }
  if (filters.city) {
    and.push({ city: { contains: filters.city } })
  }
  if (filters.artworkId) {
    and.push({ relatedArtwork: { equals: filters.artworkId } })
  }
  if (filters.episodeId) {
    and.push({ relatedEpisode: { equals: filters.episodeId } })
  }
  if (filters.lineId) {
    and.push({ lines: { in: [filters.lineId] } })
  }
  if (filters.register) {
    and.push({ register: { equals: filters.register } })
  }
  if (filters.processStage) {
    and.push({ processStage: { equals: filters.processStage } })
  }
  if (filters.conceptualThread) {
    and.push({ conceptualThread: { equals: filters.conceptualThread } })
  }
  if (filters.from) {
    and.push({ capturedAt: { greater_than_equal: filters.from } })
  }
  if (filters.to) {
    and.push({ capturedAt: { less_than_equal: filters.to } })
  }

  return and.length > 0 ? { and } : {}
}

export function parseFieldNoteFilters(
  params: Record<string, string | string[] | undefined>,
): FieldNoteListFilters {
  const pick = (key: string) => {
    const v = params[key]
    return typeof v === 'string' && v.trim() ? v.trim() : undefined
  }
  const num = (key: string) => {
    const v = pick(key)
    if (!v) return undefined
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }

  return {
    mediaType: pick('mediaType'),
    untagged: pick('untagged') === '1',
    city: pick('city'),
    artworkId: num('artworkId'),
    episodeId: num('episodeId'),
    lineId: num('lineId'),
    register: pick('register'),
    processStage: pick('processStage'),
    conceptualThread: pick('conceptualThread'),
    from: pick('from'),
    to: pick('to'),
  }
}

export async function listFieldNotes(
  payload: Payload,
  user: User,
  filters: FieldNoteListFilters,
  limit = 50,
) {
  return payload.find({
    collection: 'field-notes',
    where: buildFieldNoteWhere(filters),
    sort: '-capturedAt',
    limit,
    depth: 1,
    overrideAccess: false,
    user,
  })
}

export async function getFieldNote(payload: Payload, user: User, id: number) {
  return payload.findByID({
    collection: 'field-notes',
    id,
    depth: 2,
    overrideAccess: false,
    user,
  })
}

export type FieldNoteUpdateInput = {
  writtenNote?: string
  relatedArtwork?: number | null
  relatedEpisode?: number | null
  lines?: number[]
  register?: FieldNote['register']
  processStage?: FieldNote['processStage']
  conceptualThread?: FieldNote['conceptualThread']
  suggestedLines?: FieldNote['suggestedLines']
}

export async function updateFieldNote(
  payload: Payload,
  user: User,
  id: number,
  data: FieldNoteUpdateInput,
) {
  return payload.update({
    collection: 'field-notes',
    id,
    data,
    overrideAccess: false,
    user,
  })
}
