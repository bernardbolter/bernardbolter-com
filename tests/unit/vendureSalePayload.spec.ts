import { describe, expect, it } from 'vitest'

import {
  collectLineSelections,
  parseVendureSalePayload,
} from '@/lib/commerce/vendureSalePayload'

describe('parseVendureSalePayload', () => {
  const valid = {
    event: 'order.settled',
    orderId: '42',
    orderCode: 'T3X9K2',
    occurredAt: '2026-09-16T12:00:00.000Z',
    channel: 'default-channel',
    lines: [
      {
        vendureProductId: 'vp-large',
        vendureVariantId: 'vv-large',
        quantitySold: 1,
        selectionIds: null,
        selectionSnapshot: null,
      },
      {
        vendureProductId: 'vp-small-set',
        vendureVariantId: 'vv-small',
        quantitySold: 2,
        selectionIds: ['sel-a', 'sel-b'],
        selectionSnapshot: { ids: ['sel-a', 'sel-b'] },
      },
    ],
  }

  it('parses the multi-line order payload', () => {
    const result = parseVendureSalePayload(valid)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.orderCode).toBe('T3X9K2')
    expect(result.data.lines).toHaveLength(2)
    expect(result.data.lines[1]?.selectionIds).toEqual(['sel-a', 'sel-b'])
  })

  it('rejects a missing orderCode', () => {
    const result = parseVendureSalePayload({ ...valid, orderCode: '' })
    expect(result).toEqual({ ok: false, error: 'orderCode is required' })
  })

  it('rejects a non-array lines field', () => {
    const result = parseVendureSalePayload({ ...valid, lines: { vendureProductId: 'x' } })
    expect(result).toEqual({ ok: false, error: 'lines must be an array' })
  })

  it('rejects an invalid quantitySold', () => {
    const result = parseVendureSalePayload({
      ...valid,
      lines: [{ ...valid.lines[0], quantitySold: 0 }],
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('quantitySold')
  })
})

describe('collectLineSelections', () => {
  it('keeps per-line nulls so snapshots stay aligned', () => {
    const result = collectLineSelections([
      {
        vendureProductId: 'a',
        vendureVariantId: null,
        quantitySold: 1,
        selectionIds: null,
        selectionSnapshot: null,
      },
      {
        vendureProductId: 'b',
        vendureVariantId: null,
        quantitySold: 1,
        selectionIds: ['sel-1'],
        selectionSnapshot: { n: 1 },
      },
    ])
    expect(result.selectionIds).toEqual([null, ['sel-1']])
    expect(result.selectionSnapshot).toEqual([null, { n: 1 }])
  })

  it('stores null when no line has a selection', () => {
    const result = collectLineSelections([
      {
        vendureProductId: 'a',
        vendureVariantId: null,
        quantitySold: 1,
        selectionIds: null,
        selectionSnapshot: null,
      },
    ])
    expect(result.selectionIds).toBeNull()
    expect(result.selectionSnapshot).toBeNull()
  })
})
