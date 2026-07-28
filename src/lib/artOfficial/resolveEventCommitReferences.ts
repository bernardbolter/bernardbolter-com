import type { Payload } from 'payload'

import type { User } from '@/payload-types'

import { resolveArtHistoricalReferencesField } from './artHistoricalReferences'
import { formatDbError } from '@/lib/studio/formatDbError'

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

export async function resolveEventCommitReferences(
  ctx: CommitContext,
  patch: Record<string, unknown>,
  options?: { warnings?: string[] },
): Promise<Record<string, unknown>> {
  const out = { ...patch }
  await resolveTagFields(ctx, out)
  try {
    await resolveArtHistoricalReferencesField(ctx, out, {
      warnings: options?.warnings,
    })
  } catch (err) {
    delete out.artHistoricalReferences
    options?.warnings?.push(
      `artHistoricalReferences skipped: ${formatDbError(err)}`,
    )
  }
  return out
}
