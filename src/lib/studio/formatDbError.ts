/** Prefer the underlying Postgres/driver message when Payload wraps "Failed query: …". */
export function formatDbError(error: unknown): string {
  if (!(error instanceof Error)) return String(error)

  const parts: string[] = [error.message]
  let current: unknown = error
  const seen = new Set<unknown>()

  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current)
    const next =
      'cause' in current
        ? (current as { cause: unknown }).cause
        : undefined
    if (next instanceof Error && next.message && !parts.includes(next.message)) {
      parts.push(next.message)
    }
    current = next
  }

  if (parts.length === 1) return parts[0]!
  return `${parts[0]} — ${parts.slice(1).join(' — ')}`
}
