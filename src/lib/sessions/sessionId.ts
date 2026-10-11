/**
 * Public sessionId generation: {artwork-slug}-{YYYY-MM-DD} from completedAt
 * (or createdAt when not yet completed). No primary artwork → session-{date}.
 * Collisions append -2, -3, …
 */

export function sessionIdDatePart(iso: string | null | undefined): string {
  if (!iso) {
    return new Date().toISOString().slice(0, 10)
  }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    const slice = iso.trim().slice(0, 10)
    return /^\d{4}-\d{2}-\d{2}$/.test(slice) ? slice : new Date().toISOString().slice(0, 10)
  }
  return d.toISOString().slice(0, 10)
}

export function buildSessionIdBase(options: {
  artworkSlug?: string | null
  completedAt?: string | null
  createdAt?: string | null
}): string {
  const date = sessionIdDatePart(options.completedAt || options.createdAt)
  const art = options.artworkSlug?.trim().toLowerCase() || ''
  if (art) return `${art}-${date}`
  return `session-${date}`
}

/**
 * Pick a unique sessionId. `used` is the set of ids already claimed
 * (including other sessions in a batch rename). Does not add the result to used —
 * caller should add after accepting.
 */
export function allocateSessionId(base: string, used: Set<string>): string {
  const root = base.trim() || `session-${sessionIdDatePart(null)}`
  if (!used.has(root)) return root
  for (let n = 2; n < 1000; n += 1) {
    const candidate = `${root}-${n}`
    if (!used.has(candidate)) return candidate
  }
  return `${root}-${Date.now().toString(36)}`
}

export function readArtworkSlug(
  value: { slug?: string | null } | number | string | null | undefined,
): string | null {
  if (!value || typeof value !== 'object') return null
  const slug = value.slug?.trim()
  return slug || null
}
