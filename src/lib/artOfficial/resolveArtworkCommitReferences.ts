import type { Payload } from 'payload'

import type { Session, User } from '@/payload-types'

import { normalizeArtworkSelectFields } from './normalizeArtworkSelects'

type CommitContext = {
  payload: Payload
  user: User
  session: Session
}

function slugifyTitle(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function findSeriesIdBySlug(
  ctx: CommitContext,
  slug: string,
): Promise<number | null> {
  const res = await ctx.payload.find({
    collection: 'series',
    where: { slug: { equals: slug.trim() } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user: ctx.user,
  })
  const id = res.docs[0]?.id
  return typeof id === 'number' ? id : null
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
    const id = await findSeriesIdBySlug(ctx, slug)
    if (id == null) {
      throw new Error(
        `Series "${slug}" was not found. Create it in Series admin or stage series with a valid slug.`,
      )
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
  if (out.ach) {
    await resolveNestedImageCaptureTypes(ctx, out.ach, 'ach')
  }
  return normalizeArtworkSelectFields(out)
}
