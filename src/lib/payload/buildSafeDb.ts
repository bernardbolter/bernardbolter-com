export function isNextProductionBuild(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build'
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
    return err.message
  }
  return String(err)
}

export function isDbUnavailableError(err: unknown): boolean {
  const lower = errorMessage(err).toLowerCase()
  const payloadInit =
    err &&
    typeof err === 'object' &&
    'payloadInitError' in err &&
    (err as { payloadInitError?: boolean }).payloadInitError === true

  if (payloadInit) return true

  return (
    lower.includes('cannot connect to postgres') ||
    lower.includes('data transfer quota') ||
    lower.includes('exceeded the data transfer quota') ||
    lower.includes('econnrefused') ||
    lower.includes('enotfound') ||
    lower.includes('connection terminated') ||
    lower.includes('connection timeout')
  )
}

/** Use empty/fallback data when Postgres is unreachable (build or runtime). */
export function shouldUseDbUnavailableFallback(err: unknown): boolean {
  return isDbUnavailableError(err)
}

/** @deprecated Use shouldUseDbUnavailableFallback */
export function shouldUseBuildSafeDbFallback(err: unknown): boolean {
  return shouldUseDbUnavailableFallback(err)
}

export async function withDbUnavailableFallback<T>(
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (shouldUseDbUnavailableFallback(err)) {
      return fallback
    }
    throw err
  }
}
