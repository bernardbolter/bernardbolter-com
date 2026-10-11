import { slugifyArtworkTitle } from '@/lib/artOfficial/quickUploadDerived'

export const ENTRY_SLUG_MAX_LENGTH = 60
export const ENTRY_SLUG_MAX_WORDS = 6

/** Closed-class words skipped when picking the first significant words. */
const STOP = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'of',
  'to',
  'in',
  'on',
  'for',
  'at',
  'by',
  'as',
  'is',
  'was',
  'are',
  'were',
  'be',
  'been',
  'being',
  'with',
  'from',
  'that',
  'this',
  'these',
  'those',
  'it',
  'its',
  'into',
  'over',
  'under',
  'about',
  'after',
  'before',
  'between',
  'through',
  'during',
  'without',
  'within',
  'than',
  'then',
  'so',
  'if',
  'when',
  'while',
  'where',
  'which',
  'who',
  'whom',
  'what',
  'how',
  'not',
  'no',
  'nor',
  'his',
  'her',
  'their',
  'our',
  'your',
  'my',
])

/**
 * Cap entry permalink slugs at 60 chars on a word boundary from the first
 * 5–6 significant words of the text. Sticky once set — call only for new
 * rows or when regenerating over-length slugs.
 */
export function slugifyEntryText(
  text: string,
  options?: { maxLength?: number; maxWords?: number },
): string {
  const maxLength = options?.maxLength ?? ENTRY_SLUG_MAX_LENGTH
  const maxWords = options?.maxWords ?? ENTRY_SLUG_MAX_WORDS
  const full = slugifyArtworkTitle(text || 'entry')
  if (!full) return 'entry'
  if (full.length <= maxLength) return full

  const tokens = full.split('-').filter(Boolean)
  const significant = tokens.filter((t) => !STOP.has(t))
  const chosen = (significant.length > 0 ? significant : tokens).slice(0, maxWords)

  let slug = chosen.join('-')
  if (!slug) slug = tokens.slice(0, maxWords).join('-') || 'entry'

  if (slug.length <= maxLength) return slug

  // Trim back whole words until under the cap (never mid-word).
  const parts = slug.split('-')
  while (parts.length > 1 && parts.join('-').length > maxLength) {
    parts.pop()
  }
  slug = parts.join('-')
  if (slug.length <= maxLength) return slug || 'entry'

  // Single overlong token — hard-cut is last resort.
  return slug.slice(0, maxLength).replace(/-+$/g, '') || 'entry'
}

export function uniqueEntrySlug(base: string, used: Set<string>): string {
  let candidate = base || 'entry'
  if (!used.has(candidate)) {
    used.add(candidate)
    return candidate
  }
  for (let n = 2; n < 1000; n += 1) {
    const next = `${base}-${n}`
    if (!used.has(next)) {
      used.add(next)
      return next
    }
  }
  const fallback = `${base}-${Date.now().toString(36)}`
  used.add(fallback)
  return fallback
}
