import type { Payload } from 'payload'

import { fieldsCoveredFromTimeline } from '@/lib/artOfficial/automaticFieldConflicts'
import type { Artist, Session, User } from '@/payload-types'

import {
  type EnvelopeImportInput,
  type EnvelopeWrite,
  mapEnvelopeSessionType,
  orderEnvelopeWrites,
} from './archiveImportSchemas'
import { applyArtworkFieldsImport } from './applyArtworkFieldsImport'
import { formatDbError } from './formatDbError'
import { revalidateArtworkPaths } from './revalidateArtworkPaths'

type ReinforcingSessionRow = {
  session: number
  reinforcementNote?: string
}

export type EnvelopeWriteResult = {
  collection: string
  slug?: string
  sessionId?: string
  status: 'saved' | 'skipped' | 'failed'
  reason?: string
  warnings?: string[]
}

function relationId(value: unknown): number | null {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id: unknown }).id
    return typeof id === 'number' ? id : null
  }
  return null
}

async function resolveArtist(payload: Payload, user: User): Promise<Artist> {
  const result = await payload.find({
    collection: 'artists',
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user,
  })
  const artist = result.docs[0]
  if (!artist) throw new Error('Artist singleton not found')
  return artist
}

async function resolveSessionId(
  payload: Payload,
  user: User,
  ref: string | number | undefined,
): Promise<number | undefined> {
  if (ref == null) return undefined
  if (typeof ref === 'number') return ref

  const trimmed = ref.trim()
  if (!trimmed) return undefined

  if (/^\d+$/.test(trimmed)) return Number(trimmed)

  const bySessionId = await payload.find({
    collection: 'sessions',
    where: { sessionId: { equals: trimmed } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user,
  })
  const doc = bySessionId.docs[0]
  if (doc) return doc.id

  throw new Error(`Session not found for sourceSessionRef "${trimmed}"`)
}

async function resolveArtworkIdsBySlugs(
  payload: Payload,
  user: User,
  slugs: string[] | undefined,
): Promise<number[]> {
  if (!slugs?.length) return []
  const ids: number[] = []
  for (const slug of slugs) {
    const trimmed = slug.trim()
    if (!trimmed) continue
    const result = await payload.find({
      collection: 'artworks',
      where: { slug: { equals: trimmed } },
      limit: 1,
      depth: 0,
      overrideAccess: false,
      user,
    })
    const artwork = result.docs[0]
    if (!artwork) {
      throw new Error(`linkedArtworkSlugs: unknown slug '${trimmed}'`)
    }
    ids.push(artwork.id)
  }
  return ids
}

async function resolveOptionalArtworkIdBySlug(
  payload: Payload,
  user: User,
  slug: string | undefined,
): Promise<number | null> {
  if (!slug?.trim()) return null
  const result = await payload.find({
    collection: 'artworks',
    where: { slug: { equals: slug.trim() } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user,
  })
  const artwork = result.docs[0]
  if (!artwork) {
    throw new Error(`primaryArtwork / mentionedArtworks: unknown slug '${slug.trim()}'`)
  }
  return artwork.id
}

function entryTextKey(text: string): string {
  return text.trim()
}

function hasDuplicateBioEntry(
  artist: Artist,
  sessionId: number | undefined,
  text: string,
): boolean {
  const needle = entryTextKey(text)
  return (artist.bioTimelineEntries ?? []).some((entry) => {
    if (entryTextKey(entry.text ?? '') !== needle) return false
    if (sessionId == null) return true
    return relationId(entry.sourceSessionRef) === sessionId
  })
}

function findThroughlineIndexByText(artist: Artist, text: string): number {
  const needle = entryTextKey(text)
  return (artist.statementThroughlines ?? []).findIndex(
    (entry) => entryTextKey(entry.text ?? '') === needle,
  )
}

async function resolveReinforcingSessions(
  payload: Payload,
  user: User,
  rows:
    | Array<{ sessionId: string; reinforcementNote?: string }>
    | undefined,
): Promise<ReinforcingSessionRow[]> {
  if (!rows?.length) return []
  const out: ReinforcingSessionRow[] = []
  const seen = new Set<number>()
  for (const row of rows) {
    const id = await resolveSessionId(payload, user, row.sessionId)
    if (id == null) {
      throw new Error(`reinforcingSessions: session not found for "${row.sessionId}"`)
    }
    if (seen.has(id)) continue
    seen.add(id)
    out.push({
      session: id,
      ...(row.reinforcementNote?.trim()
        ? { reinforcementNote: row.reinforcementNote.trim() }
        : {}),
    })
  }
  return out
}

function mergeReinforcingSessions(
  existing: Array<{ session?: unknown; reinforcementNote?: string | null } | null> | null | undefined,
  incoming: ReinforcingSessionRow[],
): { merged: ReinforcingSessionRow[]; added: number } {
  const merged: ReinforcingSessionRow[] = []
  const seen = new Set<number>()
  for (const row of existing ?? []) {
    if (!row) continue
    const id = relationId(row.session)
    if (id == null || seen.has(id)) continue
    seen.add(id)
    merged.push({
      session: id,
      ...(typeof row.reinforcementNote === 'string' && row.reinforcementNote.trim()
        ? { reinforcementNote: row.reinforcementNote.trim() }
        : {}),
    })
  }
  let added = 0
  for (const row of incoming) {
    if (seen.has(row.session)) continue
    seen.add(row.session)
    merged.push(row)
    added += 1
  }
  return { merged, added }
}

async function applyBioTimelineAppend(
  payload: Payload,
  user: User,
  write: Extract<EnvelopeWrite, { collection: 'bio-timeline' }>,
  sourceSessionRefDefault: string | number | undefined,
): Promise<EnvelopeWriteResult> {
  const artist = await resolveArtist(payload, user)
  const sessionRef = write.entry.sourceSessionRef ?? sourceSessionRefDefault
  const sessionId = await resolveSessionId(payload, user, sessionRef)
  const text = write.entry.text

  if (hasDuplicateBioEntry(artist, sessionId, text)) {
    return { collection: 'bio-timeline', status: 'skipped', reason: 'duplicate entry' }
  }

  const linkedIds = await resolveArtworkIdsBySlugs(
    payload,
    user,
    write.entry.linkedArtworkSlugs,
  )

  const next = [
    ...(artist.bioTimelineEntries ?? []),
    {
      eventDate: write.entry.eventDate ?? undefined,
      text,
      sourceSessionRef: sessionId,
      linkedArtworkSlugs: linkedIds,
      visibility: write.entry.visibility ?? 'public',
    },
  ]

  await payload.update({
    collection: 'artists',
    id: artist.id,
    data: { bioTimelineEntries: next },
    overrideAccess: false,
    user,
  })

  return { collection: 'bio-timeline', status: 'saved' }
}

async function applyStatementThroughlineAppend(
  payload: Payload,
  user: User,
  write: Extract<EnvelopeWrite, { collection: 'statement-throughlines' }>,
  sourceSessionRefDefault: string | number | undefined,
): Promise<EnvelopeWriteResult> {
  const artist = await resolveArtist(payload, user)
  const sessionRef = write.entry.sourceSessionRef ?? sourceSessionRefDefault
  const sessionId = await resolveSessionId(payload, user, sessionRef)
  const text = write.entry.text
  const reinforcing = await resolveReinforcingSessions(
    payload,
    user,
    write.entry.reinforcingSessions,
  )

  const existingIdx = findThroughlineIndexByText(artist, text)
  if (existingIdx >= 0) {
    const existing = artist.statementThroughlines![existingIdx]!
    const { merged, added } = mergeReinforcingSessions(
      existing.reinforcingSessions,
      reinforcing,
    )

    if (added === 0) {
      return {
        collection: 'statement-throughlines',
        status: 'skipped',
        reason: 'duplicate entry',
      }
    }

    // Same claim text — merge new reinforcingSessions onto the live row (reinforce path).
    const next = [...(artist.statementThroughlines ?? [])]
    next[existingIdx] = {
      ...existing,
      reinforcingSessions: merged,
    }
    await payload.update({
      collection: 'artists',
      id: artist.id,
      data: { statementThroughlines: next },
      overrideAccess: false,
      user,
    })
    return {
      collection: 'statement-throughlines',
      status: 'saved',
      reason: 'merged reinforcingSessions onto existing throughline',
    }
  }

  const linkedIds = await resolveArtworkIdsBySlugs(
    payload,
    user,
    write.entry.linkedArtworkSlugs,
  )

  const next = [
    ...(artist.statementThroughlines ?? []),
    {
      dateRecognized: write.entry.dateRecognized ?? undefined,
      text,
      linkedArtworkSlugs: linkedIds,
      sourceSessionRef: sessionId,
      reinforcingSessions: reinforcing,
      visibility: write.entry.visibility ?? 'public',
    },
  ]

  await payload.update({
    collection: 'artists',
    id: artist.id,
    data: { statementThroughlines: next },
    overrideAccess: false,
    user,
  })

  return { collection: 'statement-throughlines', status: 'saved' }
}

async function applyArtworkSet(
  payload: Payload,
  user: User,
  write: Extract<EnvelopeWrite, { collection: 'artworks' }>,
): Promise<EnvelopeWriteResult> {
  const fields = { ...write.fields }
  const warnings: string[] = []

  // reasoningStatus is derived from session messages + why-fields — strip if pasted.
  if (fields.reasoningStatus !== undefined) {
    delete fields.reasoningStatus
    warnings.push(
      'reasoningStatus is derived and was ignored — do not include it in envelope writes',
    )
  }

  if (Object.keys(fields).length > 0) {
    const rows = await applyArtworkFieldsImport(payload, user, {
      slug: write.slug,
      fields,
    })
    for (const row of rows) {
      if (row.warnings?.length) warnings.push(...row.warnings)
    }
  }

  revalidateArtworkPaths(write.slug)

  return {
    collection: 'artworks',
    slug: write.slug,
    status: 'saved',
    ...(warnings.length ? { warnings } : {}),
  }
}

/**
 * Upsert a Sessions record by sessionId. `set` replaces the import surface wholesale
 * (messages always replaced; optional fields cleared when omitted).
 */
async function applySessionSet(
  payload: Payload,
  user: User,
  write: Extract<EnvelopeWrite, { collection: 'sessions' }>,
): Promise<EnvelopeWriteResult> {
  const sessionId = write.sessionId.trim()
  if (!sessionId) throw new Error('sessionId is required')

  const artist = await resolveArtist(payload, user)
  const fields = write.fields
  const sessionType = mapEnvelopeSessionType(fields.sessionType)

  const primaryArtworkId = await resolveOptionalArtworkIdBySlug(
    payload,
    user,
    fields.primaryArtwork,
  )
  const mentionedIds = await resolveArtworkIdsBySlugs(
    payload,
    user,
    fields.mentionedArtworks,
  )

  const data: Record<string, unknown> = {
    sessionId,
    sessionType,
    status: fields.status,
    artistId: artist.id,
    primaryArtwork: primaryArtworkId,
    artworkRecord: primaryArtworkId,
    mentionedArtworks: mentionedIds,
    firstImpression: fields.firstImpression?.trim() || null,
    secondDescription: fields.secondDescription?.trim() || null,
    sessionNotes: fields.sessionNotes?.trim() || null,
    proposedAbstracts: (fields.proposedAbstracts ?? []).map((row) => ({
      targetCollection: row.targetCollection,
      text: row.text,
      status: row.status,
    })),
    messages: fields.messages,
    completedAt: fields.status === 'completed' ? new Date().toISOString() : null,
  }

  if (fields.fieldUpdateTimeline !== undefined) {
    data.fieldUpdateTimeline = fields.fieldUpdateTimeline
    // Keep /sessions gloss + commit-path consumers in sync (same derivation as admin commit).
    data.fieldsCoveredThisSession = fieldsCoveredFromTimeline(fields.fieldUpdateTimeline)
  }

  const existing = await payload.find({
    collection: 'sessions',
    where: { sessionId: { equals: sessionId } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user,
  })
  const doc = existing.docs[0]

  if (doc) {
    await payload.update({
      collection: 'sessions',
      id: doc.id,
      data: data as never,
      overrideAccess: false,
      user,
    })
  } else {
    if (data.fieldUpdateTimeline === undefined) {
      data.fieldUpdateTimeline = []
      data.fieldsCoveredThisSession = []
    }
    await payload.create({
      collection: 'sessions',
      data: data as never,
      overrideAccess: false,
      user,
    })
  }

  return {
    collection: 'sessions',
    sessionId,
    status: 'saved',
  }
}

export async function applyEnvelopeImport(
  payload: Payload,
  user: User,
  input: EnvelopeImportInput,
): Promise<EnvelopeWriteResult[]> {
  const results: EnvelopeWriteResult[] = []
  const sourceDefault = input.sourceSessionRef
  const orderedWrites = orderEnvelopeWrites(input.writes)

  for (const write of orderedWrites) {
    try {
      if (write.collection === 'artworks') {
        results.push(await applyArtworkSet(payload, user, write))
      } else if (write.collection === 'sessions') {
        results.push(await applySessionSet(payload, user, write))
      } else if (write.collection === 'bio-timeline') {
        results.push(
          await applyBioTimelineAppend(payload, user, write, sourceDefault),
        )
      } else if (write.collection === 'statement-throughlines') {
        results.push(
          await applyStatementThroughlineAppend(payload, user, write, sourceDefault),
        )
      } else {
        const _exhaustive: never = write
        results.push({
          collection: String(_exhaustive),
          status: 'failed',
          reason: 'Unknown collection',
        })
      }
    } catch (error) {
      const reason = formatDbError(error)
      results.push({
        collection: write.collection,
        slug: write.collection === 'artworks' ? write.slug : undefined,
        sessionId: write.collection === 'sessions' ? write.sessionId : undefined,
        status: 'failed',
        reason,
      })
    }
  }

  return results
}

/** Apply accepted/edited/proposed abstracts from a session onto the Artist singleton. */
export async function applySessionProposedAbstracts(
  payload: Payload,
  user: User,
  session: Session,
): Promise<EnvelopeWriteResult[]> {
  const abstracts = session.proposedAbstracts ?? []
  const toWrite = abstracts.filter((row) => row.status !== 'rejected' && row.text?.trim())
  if (!toWrite.length) return []

  const linkedSlugsFor = async (ids: (number | { id: number })[] | null | undefined) => {
    if (!ids?.length) return [] as string[]
    const slugs: string[] = []
    for (const entry of ids) {
      const id = relationId(entry)
      if (id == null) continue
      try {
        const artwork = await payload.findByID({
          collection: 'artworks',
          id,
          depth: 0,
          overrideAccess: false,
          user,
        })
        if (artwork?.slug) slugs.push(artwork.slug)
      } catch {
        // skip missing
      }
    }
    return slugs
  }

  const writes: EnvelopeWrite[] = []
  for (const row of toWrite) {
    const linkedArtworkSlugs = await linkedSlugsFor(row.linkedArtworks)
    if (row.targetCollection === 'bio-timeline') {
      writes.push({
        collection: 'bio-timeline',
        operation: 'append',
        entry: {
          eventDate: row.eventDate ?? undefined,
          text: row.text,
          sourceSessionRef: session.id,
          linkedArtworkSlugs,
        },
      })
    } else if (row.targetCollection === 'statement-throughline') {
      writes.push({
        collection: 'statement-throughlines',
        operation: 'append',
        entry: {
          dateRecognized: row.dateRecognized ?? undefined,
          text: row.text,
          sourceSessionRef: session.id,
          linkedArtworkSlugs,
        },
      })
    }
  }

  if (!writes.length) return []

  return applyEnvelopeImport(payload, user, {
    sourceSessionRef: session.id,
    writes,
  })
}
