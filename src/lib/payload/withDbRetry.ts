const TRANSIENT_DB_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EPIPE',
  '57P01', // admin_shutdown
  '08006', // connection_failure
  '08003', // connection_does_not_exist
  '08001', // sqlclient_unable_to_establish_sqlconnection
])

function isTransientDbError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false

  const code = 'code' in err && typeof err.code === 'string' ? err.code : null
  if (code && TRANSIENT_DB_CODES.has(code)) return true

  const cause = 'cause' in err ? err.cause : null
  if (cause && typeof cause === 'object' && 'code' in cause && typeof cause.code === 'string') {
    if (TRANSIENT_DB_CODES.has(cause.code)) return true
  }

  const message = 'message' in err && typeof err.message === 'string' ? err.message : ''
  for (const token of TRANSIENT_DB_CODES) {
    if (message.includes(token)) return true
  }
  return false
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Retry short-lived Neon / Postgres connection drops (common in local dev). */
export async function withDbRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt >= attempts || !isTransientDbError(err)) {
        throw err
      }
      await sleep(150 * attempt)
    }
  }

  throw lastError
}
