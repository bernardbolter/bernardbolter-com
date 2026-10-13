import { createHmac } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import {
  isUniqueConstraintError,
  verifyVendureWebhookSignature,
} from '@/lib/commerce/vendureWebhookSignature'

const SECRET = 'unit-test-webhook-secret'

function sign(timestamp: string, rawBody: string): string {
  const hmac = createHmac('sha256', SECRET)
    .update(Buffer.concat([Buffer.from(`${timestamp}.`, 'utf8'), Buffer.from(rawBody, 'utf8')]))
    .digest('hex')
  return `sha256=${hmac}`
}

describe('verifyVendureWebhookSignature', () => {
  const rawBody = Buffer.from('{"orderCode":"T-1","orderId":"1"}', 'utf8')
  const nowSeconds = 1_700_000_000
  const timestamp = String(nowSeconds)

  it('accepts a valid HMAC of timestamp + raw body bytes', () => {
    const result = verifyVendureWebhookSignature({
      timestampHeader: timestamp,
      signatureHeader: sign(timestamp, rawBody.toString('utf8')),
      rawBody,
      secret: SECRET,
      nowSeconds,
    })
    expect(result).toEqual({ ok: true })
  })

  it('rejects a signature computed over re-serialized JSON', () => {
    const compact = '{"orderCode":"T-1","orderId":"1"}'
    const pretty = JSON.stringify(JSON.parse(compact), null, 2)
    const result = verifyVendureWebhookSignature({
      timestampHeader: timestamp,
      signatureHeader: sign(timestamp, pretty),
      rawBody: Buffer.from(compact, 'utf8'),
      secret: SECRET,
      nowSeconds,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('Invalid webhook signature')
  })

  it('rejects a missing signature header', () => {
    const result = verifyVendureWebhookSignature({
      timestampHeader: timestamp,
      signatureHeader: null,
      rawBody,
      secret: SECRET,
      nowSeconds,
    })
    expect(result).toEqual({ ok: false, error: 'Missing webhook signature headers' })
  })

  it('rejects a stale timestamp', () => {
    const stale = String(nowSeconds - 5 * 60 - 1)
    const result = verifyVendureWebhookSignature({
      timestampHeader: stale,
      signatureHeader: sign(stale, rawBody.toString('utf8')),
      rawBody,
      secret: SECRET,
      nowSeconds,
    })
    expect(result).toEqual({ ok: false, error: 'Stale webhook timestamp' })
  })

  it('rejects a wrong HMAC', () => {
    const result = verifyVendureWebhookSignature({
      timestampHeader: timestamp,
      signatureHeader: 'sha256=' + 'a'.repeat(64),
      rawBody,
      secret: SECRET,
      nowSeconds,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('Invalid webhook signature')
  })
})

describe('isUniqueConstraintError', () => {
  it('detects postgres 23505 on the error or its cause', () => {
    expect(isUniqueConstraintError({ code: '23505' })).toBe(true)
    expect(isUniqueConstraintError({ cause: { code: '23505' } })).toBe(true)
  })

  it('detects Payload unique validation messages', () => {
    expect(
      isUniqueConstraintError({
        data: { errors: [{ message: 'Value must be unique' }] },
      }),
    ).toBe(true)
  })

  it('does not treat unrelated errors as unique', () => {
    expect(isUniqueConstraintError(new Error('connection timeout'))).toBe(false)
  })
})
