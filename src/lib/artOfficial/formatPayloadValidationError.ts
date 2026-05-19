/** Turn Payload ValidationError into a short user-facing commit message. */
export function formatPayloadValidationError(err: unknown): string | null {
  if (!err || typeof err !== 'object' || !('data' in err)) return null
  const data = (err as { data?: { errors?: Array<{ message?: string; path?: string }> } }).data
  const parts =
    data?.errors
      ?.map((e) => {
        const path = Array.isArray(e.path) ? e.path.join(' > ') : e.path
        if (path && e.message) return `${path}: ${e.message}`
        return e.message ?? path
      })
      .filter(Boolean) ?? []
  return parts.length > 0 ? parts.join('; ') : null
}
