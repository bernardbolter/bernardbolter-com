import { revalidatePath, revalidateTag } from 'next/cache'

import { pathsToAbsoluteUrls, purgeCloudflareCache } from './purgeCloudflare'

/** Cache tag for corpus DataFeed responses — busted only via revalidateCorpusFeed. */
export const CORPUS_FEED_TAG = 'corpus'

/** Machine-readable corpus API paths (not HTML artwork pages). */
export const CORPUS_FEED_PATHS = [
  '/api/corpus',
  '/api/corpus/index',
  '/api/corpus/sessions',
  '/corpus',
] as const

export type RevalidateCorpusFeedOptions = {
  artworkSlug?: string
  artworkSlugs?: string[]
  /** Event slugs — invalidate `/api/corpus/{slug}/sessions` under event-${slug} scope. */
  eventSlug?: string
  eventSlugs?: string[]
  sessionId?: string
}

/**
 * Dedicated corpus regeneration trigger — separate from individual artwork page ISR.
 *
 * Page-level revalidatePath alone has left /api/corpus on multi-day stale snapshots while
 * /{slug} pages looked live. Call this on every artwork/session write that should appear
 * in the external machine index.
 */
export function revalidateCorpusFeed(options: RevalidateCorpusFeedOptions = {}): void {
  const paths = new Set<string>(CORPUS_FEED_PATHS)

  const slugs = new Set<string>()
  if (options.artworkSlug?.trim()) slugs.add(options.artworkSlug.trim())
  for (const slug of options.artworkSlugs ?? []) {
    if (slug.trim()) slugs.add(slug.trim())
  }

  for (const slug of slugs) {
    paths.add(`/api/corpus/${slug}`)
    paths.add(`/api/corpus/${slug}/sessions`)
    paths.add(`/sessions?artwork=${encodeURIComponent(slug)}`)
  }

  const eventSlugs = new Set<string>()
  if (options.eventSlug?.trim()) eventSlugs.add(options.eventSlug.trim())
  for (const slug of options.eventSlugs ?? []) {
    if (slug.trim()) eventSlugs.add(slug.trim())
  }
  for (const slug of eventSlugs) {
    paths.add(`/api/corpus/${slug}`)
    paths.add(`/api/corpus/${slug}/sessions`)
    paths.add(`/api/corpus/${slug}/sessions?type=event`)
    paths.add(`/events/${slug}`)
  }

  const sessionId = options.sessionId?.trim()
  if (sessionId) {
    paths.add(`/api/corpus/sessions/${sessionId}`)
    paths.add(`/api/corpus/sessions/${sessionId}?tier=5`)
    paths.add(`/sessions/${sessionId}`)
  }

  try {
    revalidateTag(CORPUS_FEED_TAG, 'max')
    for (const path of eventSlugs) {
      revalidateTag(`event-${path}`, 'max')
    }
    for (const path of paths) {
      revalidatePath(path)
    }
  } catch {
    // No Next.js static generation store (seed scripts, tests)
  }

  void purgeCloudflareCache(pathsToAbsoluteUrls([...paths])).catch(() => {
    // Purge failures must not block saves
  })
}
