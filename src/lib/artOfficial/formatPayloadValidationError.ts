/** Turn Payload / Postgres errors into a short user-facing commit message. */
export function formatPayloadValidationError(err: unknown): string | null {
  const postgres = extractPostgresError(err)
  if (postgres) return postgres

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

function extractPostgresError(err: unknown): string | null {
  if (!err || typeof err !== 'object') return null

  const walk = (node: unknown, depth = 0): string | null => {
    if (!node || typeof node !== 'object' || depth > 4) return null
    const pg = node as {
      code?: string
      column?: string
      message?: string
      cause?: unknown
    }

    if (pg.code === '23502' && pg.column) {
      return `Database rejected the save: "${pg.column}" is required but was empty. This often means a series-specific tab field was marked required in the schema — retry after a dev server restart so the database can sync.`
    }

    if (typeof pg.message === 'string' && pg.message.includes('violates not-null constraint')) {
      const match = pg.message.match(/column "([^"]+)"/)
      if (match?.[1]) {
        return `Database rejected the save: column "${match[1]}" cannot be empty. Restart the dev server to sync schema, then commit again.`
      }
    }

    if (pg.cause) return walk(pg.cause, depth + 1)
    return null
  }

  return walk(err)
}
