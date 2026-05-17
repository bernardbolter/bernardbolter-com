import { describe, expect, it } from 'vitest'

import {
  decrementTriptychPrintAvailableCount,
  findTriptychByVendurePrintProductId,
} from '@/lib/commerce/decrementTriptychPrintCount'

describe('decrementTriptychPrintAvailableCount', () => {
  const triptych = {
    id: 1,
    printSets: [
      { size: 'large', edition: 15, vendureProductId: 'vp-large', printAvailableCount: 10 },
      { size: 'small', edition: 30, vendureProductId: 'vp-small', printAvailableCount: 30 },
    ],
  }

  it('decrements the matching print set row', () => {
    const result = decrementTriptychPrintAvailableCount(triptych, 'vp-large', 2)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.printSets[0]?.printAvailableCount).toBe(8)
    expect(result.printSets[1]?.printAvailableCount).toBe(30)
  })

  it('does not go below zero', () => {
    const result = decrementTriptychPrintAvailableCount(triptych, 'vp-large', 99)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.printSets[0]?.printAvailableCount).toBe(0)
  })

  it('returns not-found when product id does not match', () => {
    const result = decrementTriptychPrintAvailableCount(triptych, 'unknown', 1)
    expect(result).toEqual({ ok: false, reason: 'not-found' })
  })

  it('rejects invalid quantity', () => {
    expect(decrementTriptychPrintAvailableCount(triptych, 'vp-large', 0)).toEqual({
      ok: false,
      reason: 'invalid-quantity',
    })
  })
})

describe('findTriptychByVendurePrintProductId', () => {
  it('finds the triptych containing the product id', () => {
    const docs = [
      { id: 1, printSets: [{ vendureProductId: 'a' }] },
      { id: 2, printSets: [{ vendureProductId: 'b' }] },
    ]
    expect(findTriptychByVendurePrintProductId(docs, 'b')?.id).toBe(2)
  })
})
