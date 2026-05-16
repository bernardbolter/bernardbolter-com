const WINDOW_MS = 10 * 60 * 1000
const MAX_REQUESTS = 60

const buckets = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(userId: string | number): { ok: true } | { ok: false } {
  const key = String(userId)
  const now = Date.now()
  const entry = buckets.get(key)

  if (!entry || now >= entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { ok: true }
  }

  if (entry.count >= MAX_REQUESTS) {
    return { ok: false }
  }

  entry.count += 1
  return { ok: true }
}
