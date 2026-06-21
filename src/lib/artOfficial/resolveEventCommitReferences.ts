import type { Payload } from 'payload'

import type { User } from '@/payload-types'

type CommitContext = {
  payload: Payload
  user: User
}

const TAG_FIELDS = {
  movementTags: 'movement',
  styleTags: 'style',
  subjectTags: 'subject',
  genreTags: 'genre',
  periodTags: 'period',
} as const

type TagType = (typeof TAG_FIELDS)[keyof typeof TAG_FIELDS]

async function resolveTagLabel(
  ctx: CommitContext,
  label: string,
  type: TagType,
): Promise<number | null> {
  const trimmed = label.trim()
  if (!trimmed) return null
  if (/^\d+$/.test(trimmed)) return Number(trimmed)

  const res = await ctx.payload.find({
    collection: 'tags',
    where: {
      and: [{ label: { equals: trimmed } }, { type: { equals: type } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user: ctx.user,
  })
  return typeof res.docs[0]?.id === 'number' ? res.docs[0].id : null
}

async function resolveOrCreateTagLabel(
  ctx: CommitContext,
  label: string,
  type: TagType,
): Promise<number | null> {
  const existing = await resolveTagLabel(ctx, label, type)
  if (existing != null) return existing

  const trimmed = label.trim()
  if (!trimmed || /^\d+$/.test(trimmed)) return null

  try {
    const created = await ctx.payload.create({
      collection: 'tags',
      data: { label: trimmed, type },
      overrideAccess: false,
      user: ctx.user,
    })
    return typeof created.id === 'number' ? created.id : null
  } catch {
    return resolveTagLabel(ctx, label, type)
  }
}

async function resolveTagFields(
  ctx: CommitContext,
  patch: Record<string, unknown>,
): Promise<void> {
  for (const [field, type] of Object.entries(TAG_FIELDS)) {
    const value = patch[field]
    if (!Array.isArray(value)) continue

    const ids: number[] = []
    for (const item of value) {
      const label = typeof item === 'string' ? item : String(item ?? '')
      const id = await resolveOrCreateTagLabel(ctx, label, type)
      if (id != null) ids.push(id)
    }
    if (ids.length) patch[field] = ids
    else delete patch[field]
  }
}

async function resolveArtHistoricalReferences(
  ctx: CommitContext,
  patch: Record<string, unknown>,
): Promise<void> {
  const value = patch.artHistoricalReferences
  if (!Array.isArray(value)) return

  const ids: number[] = []
  for (const item of value) {
    if (typeof item === 'number') {
      ids.push(item)
      continue
    }
    if (typeof item === 'string' && /^\d+$/.test(item)) {
      ids.push(Number(item))
      continue
    }
    if (item && typeof item === 'object' && 'id' in item) {
      const id = Number((item as { id: unknown }).id)
      if (!Number.isNaN(id)) ids.push(id)
    }
  }
  if (ids.length) patch.artHistoricalReferences = ids
  else delete patch.artHistoricalReferences
}

export async function resolveEventCommitReferences(
  ctx: CommitContext,
  patch: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const out = { ...patch }
  await resolveTagFields(ctx, out)
  await resolveArtHistoricalReferences(ctx, out)
  return out
}
