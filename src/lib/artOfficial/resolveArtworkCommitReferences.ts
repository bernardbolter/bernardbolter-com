import type { Payload } from 'payload'

import type { Session, User } from '@/payload-types'

import { normalizeSizeTier } from './inferSizeTier'
import { getCustomMediums, registerCustomMedium } from './artworkMediumOptions'
import { normalizeArtworkSelectFields } from './normalizeArtworkSelects'
import { findSeriesIdBySlug, seriesNotFoundMessage } from './seriesSlugs'

type CommitContext = {
  payload: Payload
  user: User
  session: Session
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
      and: [
        { label: { equals: trimmed } },
        { type: { equals: type } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user: ctx.user,
  })
  return typeof res.docs[0]?.id === 'number' ? res.docs[0].id : null
}

/** Find tag by label or create a controlled-vocabulary row so staged labels survive commit. */
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

/** Resolve tag label strings → IDs for all tag relationship fields. Unknown labels are silently dropped. */
async function resolveTagFields(
  ctx: CommitContext,
  patch: Record<string, unknown>,
): Promise<void> {
  for (const [field, tagType] of Object.entries(TAG_FIELDS)) {
    const raw = patch[field]
    if (raw == null) continue

    // Already an array of IDs → pass through
    if (Array.isArray(raw) && raw.every((v) => typeof v === 'number')) continue

    const items = Array.isArray(raw) ? raw : [raw]
    const ids: number[] = []

    for (const item of items) {
      if (typeof item === 'number') {
        ids.push(item)
        continue
      }
      if (typeof item === 'string') {
        const id = await resolveOrCreateTagLabel(ctx, item, tagType)
        if (id != null) ids.push(id)
      }
    }

    if (ids.length > 0) {
      patch[field] = ids
    } else {
      delete patch[field]
    }
  }
}

async function resolveArtworkIdBySlugOrId(
  ctx: CommitContext,
  value: unknown,
): Promise<number | null> {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id: unknown }).id
    return typeof id === 'number' ? id : null
  }
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^\d+$/.test(trimmed)) return Number(trimmed)

  const result = await ctx.payload.find({
    collection: 'artworks',
    where: { slug: { equals: trimmed } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user: ctx.user,
  })
  const doc = result.docs[0]
  return typeof doc?.id === 'number' ? doc.id : null
}

async function resolveSessionIdByRef(
  ctx: CommitContext,
  value: unknown,
): Promise<number | null> {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id: unknown }).id
    return typeof id === 'number' ? id : null
  }
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^\d+$/.test(trimmed)) return Number(trimmed)

  const result = await ctx.payload.find({
    collection: 'sessions',
    where: { sessionId: { equals: trimmed } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user: ctx.user,
  })
  const doc = result.docs[0]
  return typeof doc?.id === 'number' ? doc.id : null
}

/** Resolve relatedArtwork / sourceSessionRef slugs → IDs on relatedWorksAtMaking rows. */
async function resolveRelatedWorksAtMaking(
  ctx: CommitContext,
  patch: Record<string, unknown>,
): Promise<void> {
  const raw = patch.relatedWorksAtMaking
  if (!Array.isArray(raw) || raw.length === 0) return

  const next: Array<Record<string, unknown>> = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const entry = { ...(row as Record<string, unknown>) }
    const artworkId = await resolveArtworkIdBySlugOrId(ctx, entry.relatedArtwork)
    if (artworkId == null) continue
    entry.relatedArtwork = artworkId

    if (entry.sourceSessionRef != null && entry.sourceSessionRef !== '') {
      const sessionId = await resolveSessionIdByRef(ctx, entry.sourceSessionRef)
      if (sessionId != null) entry.sourceSessionRef = sessionId
      else delete entry.sourceSessionRef
    }

    const relationType = entry.relationType
    if (
      relationType !== 'paired' &&
      relationType !== 'concurrent' &&
      relationType !== 'predecessor' &&
      relationType !== 'successor'
    ) {
      continue
    }

    next.push(entry)
  }

  if (next.length) patch.relatedWorksAtMaking = next
  else delete patch.relatedWorksAtMaking
}

function slugifyTitle(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function findSeriesIdBySlugForCommit(
  ctx: CommitContext,
  slug: string,
): Promise<number | null> {
  return findSeriesIdBySlug(ctx, slug)
}

async function resolveSeriesSlugForNormalize(
  ctx: CommitContext,
  patch: Record<string, unknown>,
): Promise<string | undefined> {
  if (typeof patch.seriesSlug === 'string' && patch.seriesSlug.trim()) {
    return patch.seriesSlug.trim()
  }

  const raw = patch.series
  if (typeof raw === 'string' && !/^\d+$/.test(raw.trim())) {
    return raw.trim()
  }

  const seriesId =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string' && /^\d+$/.test(raw.trim())
        ? Number(raw.trim())
        : null

  if (seriesId == null) return undefined

  try {
    const doc = await ctx.payload.findByID({
      collection: 'series',
      id: seriesId,
      depth: 0,
      overrideAccess: false,
      user: ctx.user,
    })
    return typeof doc.slug === 'string' && doc.slug.trim() ? doc.slug.trim() : undefined
  } catch {
    return undefined
  }
}

async function resolveSeriesField(ctx: CommitContext, patch: Record<string, unknown>): Promise<void> {
  const raw = patch.series
  const slugFromField =
    typeof raw === 'string' && !/^\d+$/.test(raw.trim()) ? raw.trim() : null
  const slugFromSeriesSlug =
    typeof patch.seriesSlug === 'string' ? patch.seriesSlug.trim() : null
  const slug = slugFromField ?? slugFromSeriesSlug

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    try {
      await ctx.payload.findByID({
        collection: 'series',
        id: raw,
        depth: 0,
        overrideAccess: false,
        user: ctx.user,
      })
      return
    } catch {
      // fall through to slug lookup
    }
  }

  if (typeof raw === 'string' && /^\d+$/.test(raw.trim())) {
    patch.series = Number(raw.trim())
    return
  }

  if (slug) {
    const id = await findSeriesIdBySlugForCommit(ctx, slug)
    if (id == null) {
      throw new Error(await seriesNotFoundMessage(ctx, slug))
    }
    patch.series = id
    delete patch.seriesSlug
    return
  }

  if (raw != null && raw !== '') {
    throw new Error(
      'Series must be a Payload series id or slug (e.g. a-colorful-history). Stage series in chat or pick it in admin.',
    )
  }
}

async function resolveImageCaptureTechnology(
  ctx: CommitContext,
  value: unknown,
): Promise<number | null> {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^\d+$/.test(trimmed)) return Number(trimmed)

  const res = await ctx.payload.find({
    collection: 'image-capture-technologies',
    where: { slug: { equals: trimmed } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user: ctx.user,
  })
  const id = res.docs[0]?.id
  return typeof id === 'number' ? id : null
}

async function resolveNestedImageCaptureTypes(
  ctx: CommitContext,
  node: unknown,
  path: string,
): Promise<void> {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return

  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    const nextPath = path ? `${path}.${key}` : key
    if (key === 'imageCaptureType') {
      const id = await resolveImageCaptureTechnology(ctx, value)
      if (id != null) {
        ;(node as Record<string, unknown>)[key] = id
      } else if (typeof value === 'string' && value.trim()) {
        throw new Error(
          `Image capture technology "${value}" was not found (${nextPath}). Run the seed script or pick a record in admin.`,
        )
      }
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      await resolveNestedImageCaptureTypes(ctx, value, nextPath)
    }
  }
}

function ensureCreator(patch: Record<string, unknown>, session: Session): void {
  if (patch.creator != null && patch.creator !== '') return
  const artistId =
    typeof session.artistId === 'object' && session.artistId
      ? session.artistId.id
      : session.artistId
  if (artistId != null) {
    patch.creator = artistId
  }
}

function ensureSlug(patch: Record<string, unknown>): void {
  if (typeof patch.slug === 'string' && patch.slug.trim()) return
  const title = typeof patch.title === 'string' ? patch.title.trim() : ''
  if (title) patch.slug = slugifyTitle(title)
}

/**
 * Resolve slugs → relationship ids and fill required defaults before artwork create/update.
 */
export async function resolveArtworkCommitReferences(
  ctx: CommitContext,
  patch: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const out = { ...patch }
  ensureCreator(out, ctx.session)
  ensureSlug(out)
  await resolveSeriesField(ctx, out)
  await resolveTagFields(ctx, out)
  await resolveRelatedWorksAtMaking(ctx, out)
  if (out.ach) {
    await resolveNestedImageCaptureTypes(ctx, out.ach, 'ach')
  }

  const seriesSlug = await resolveSeriesSlugForNormalize(ctx, out)

  const stagedTier = normalizeSizeTier(out.sizeTier)
  if (stagedTier) out.sizeTier = stagedTier
  else delete out.sizeTier

  await resolveMediumOtherAtCommit(ctx, out)

  const customMediums = await getCustomMediums(ctx.payload)
  return normalizeArtworkSelectFields(out, {
    seriesSlug,
    extraMediumValues: customMediums.map((row) => row.value),
  })
}

/**
 * When the artist’s medium isn’t in the built-in list, dialogue stages
 * `medium: "other"` + `mediumOther: "<label>"`. Register that label (same path as
 * Quick Upload) and store the reusable slug on `medium` before select normalize.
 */
async function resolveMediumOtherAtCommit(
  ctx: CommitContext,
  out: Record<string, unknown>,
): Promise<void> {
  const label = typeof out.mediumOther === 'string' ? out.mediumOther.trim() : ''
  if (!label) return

  const mediumRaw = typeof out.medium === 'string' ? out.medium.trim() : ''
  // Only register when medium is explicitly "other", missing, or still the sentinel.
  // If a real built-in/custom slug was already staged, drop the orphan mediumOther.
  if (mediumRaw && mediumRaw !== 'other') {
    const existing = await getCustomMediums(ctx.payload)
    const known = new Set([
      'acrylic-photo-transfer-on-canvas',
      'acrylic-on-canvas',
      'mixed-media-on-canvas',
      'photo-collage',
      'video',
      'digital',
      ...existing.map((row) => row.value),
    ])
    if (known.has(mediumRaw)) {
      delete out.mediumOther
      return
    }
  }

  const registered = await registerCustomMedium(ctx.payload, label)
  out.medium = registered.value
  delete out.mediumOther
}
