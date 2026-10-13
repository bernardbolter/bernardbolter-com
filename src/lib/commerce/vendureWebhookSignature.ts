import { createHmac, timingSafeEqual } from 'node:crypto'

/** Reject timestamps older than this (Vendure signs `<timestamp>.<raw body>`). */
export const VENDURE_WEBHOOK_MAX_AGE_SECONDS = 5 * 60

export type SignatureVerifyResult =
  | { ok: true }
  | { ok: false; error: string }

function timingSafeEqualString(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) {
    timingSafeEqual(aBuf, aBuf)
    return false
  }
  return timingSafeEqual(aBuf, bBuf)
}

/**
 * HMAC-SHA256 of `"<unixSeconds>.<raw request body bytes>"`, compared as `sha256=<hex>`.
 * Uses the raw body buffer — never a re-serialized JSON object.
 */
export function verifyVendureWebhookSignature(args: {
  timestampHeader: string | null
  signatureHeader: string | null
  rawBody: Buffer
  secret: string
  nowSeconds?: number
}): SignatureVerifyResult {
  const timestampHeader = args.timestampHeader?.trim() ?? ''
  const signatureHeader = args.signatureHeader?.trim() ?? ''

  if (!timestampHeader || !signatureHeader) {
    return { ok: false, error: 'Missing webhook signature headers' }
  }

  if (!/^\d+$/.test(timestampHeader)) {
    return { ok: false, error: 'Invalid webhook timestamp' }
  }

  const timestamp = Number.parseInt(timestampHeader, 10)
  const nowSeconds = args.nowSeconds ?? Math.floor(Date.now() / 1000)
  if (nowSeconds - timestamp > VENDURE_WEBHOOK_MAX_AGE_SECONDS) {
    return { ok: false, error: 'Stale webhook timestamp' }
  }

  const prefix = 'sha256='
  if (!signatureHeader.toLowerCase().startsWith(prefix)) {
    return { ok: false, error: 'Invalid webhook signature' }
  }

  const providedHex = signatureHeader.slice(prefix.length).toLowerCase()
  if (!/^[0-9a-f]+$/.test(providedHex)) {
    return { ok: false, error: 'Invalid webhook signature' }
  }

  const signedPayload = Buffer.concat([Buffer.from(`${timestampHeader}.`, 'utf8'), args.rawBody])
  const expectedHex = createHmac('sha256', args.secret).update(signedPayload).digest('hex')

  if (!timingSafeEqualString(`sha256=${expectedHex}`, `sha256=${providedHex}`)) {
    return { ok: false, error: 'Invalid webhook signature' }
  }

  return { ok: true }
}

/** Postgres 23505 / Payload unique validation — treat as already-processed. */
export function isUniqueConstraintError(err: unknown): boolean {
  let current: unknown = err
  for (let depth = 0; depth < 6 && current && typeof current === 'object'; depth += 1) {
    const node = current as { code?: unknown; cause?: unknown; message?: unknown; data?: unknown }

    if (node.code === '23505') return true

    if (typeof node.message === 'string') {
      const lower = node.message.toLowerCase()
      if (lower.includes('already exists') || lower.includes('duplicate key')) return true
      if (lower.includes('value must be unique') || lower.includes('must be unique')) return true
    }

    const errors = (node.data as { errors?: Array<{ message?: string }> } | undefined)?.errors
    if (Array.isArray(errors)) {
      for (const item of errors) {
        const msg = item?.message?.toLowerCase() ?? ''
        if (msg.includes('unique')) return true
      }
    }

    current = node.cause
  }

  return false
}
