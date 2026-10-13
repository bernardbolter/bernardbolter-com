export type TriptychPrintSetRow = {
  size?: 'large' | 'small' | null
  edition?: number | null
  vendureProductId?: string | null
  printAvailableCount?: number | null
  id?: string | null
}

export type TriptychForPrintSync = {
  id: number | string
  printSets?: TriptychPrintSetRow[] | null
}

export type DecrementResult =
  | { ok: true; triptychId: number | string; printSets: TriptychPrintSetRow[] }
  | { ok: false; reason: 'not-found' | 'invalid-quantity' | 'no-print-sets' }

/**
 * Returns updated printSets for a triptych after a Vendure sale, or a failure reason.
 * Does not persist — caller runs payload.update.
 */
export function decrementTriptychPrintAvailableCount(
  triptych: TriptychForPrintSync,
  vendureProductId: string,
  quantitySold: number,
): DecrementResult {
  if (!Number.isFinite(quantitySold) || quantitySold < 1) {
    return { ok: false, reason: 'invalid-quantity' }
  }

  const printSets = triptych.printSets
  if (!Array.isArray(printSets) || printSets.length === 0) {
    return { ok: false, reason: 'no-print-sets' }
  }

  const targetId = vendureProductId.trim()
  let matched = false
  const updated = printSets.map((row) => {
    if (!row || row.vendureProductId?.trim() !== targetId) return row
    matched = true
    const current =
      typeof row.printAvailableCount === 'number' ? row.printAvailableCount : 0
    return {
      ...row,
      printAvailableCount: Math.max(0, current - quantitySold),
    }
  })

  if (!matched) {
    return { ok: false, reason: 'not-found' }
  }

  return { ok: true, triptychId: triptych.id, printSets: updated }
}

export function findTriptychByVendurePrintProductId(
  triptychs: TriptychForPrintSync[],
  vendureProductId: string,
): TriptychForPrintSync | undefined {
  const targetId = vendureProductId.trim()
  return triptychs.find((doc) =>
    Array.isArray(doc.printSets) &&
    doc.printSets.some((row) => row?.vendureProductId?.trim() === targetId),
  )
}

export type TriptychPrintSaleUpdate = {
  triptychId: number | string
  printSets: TriptychPrintSetRow[]
}

export type ApplyPrintSalesResult =
  | { ok: true; updates: TriptychPrintSaleUpdate[] }
  | { ok: false; reason: 'invalid-quantity' }

/**
 * Applies quantitySold from each sale line onto matching triptych print sets.
 * Lines whose vendureProductId is not a triptych print are skipped (e.g. selections).
 */
export function applyTriptychPrintSalesFromLines(
  triptychs: TriptychForPrintSync[],
  lines: Array<{ vendureProductId: string; quantitySold: number }>,
): ApplyPrintSalesResult {
  const working = new Map<string | number, TriptychForPrintSync>()
  for (const doc of triptychs) {
    working.set(doc.id, {
      id: doc.id,
      printSets: Array.isArray(doc.printSets) ? [...doc.printSets] : doc.printSets,
    })
  }

  const touched = new Set<string | number>()

  for (const line of lines) {
    if (!Number.isFinite(line.quantitySold) || line.quantitySold < 1) {
      return { ok: false, reason: 'invalid-quantity' }
    }

    const match = findTriptychByVendurePrintProductId([...working.values()], line.vendureProductId)
    if (!match) continue

    const current = working.get(match.id) ?? match
    const result = decrementTriptychPrintAvailableCount(
      current,
      line.vendureProductId,
      line.quantitySold,
    )
    if (!result.ok) {
      if (result.reason === 'invalid-quantity') {
        return { ok: false, reason: 'invalid-quantity' }
      }
      continue
    }

    working.set(result.triptychId, { id: result.triptychId, printSets: result.printSets })
    touched.add(result.triptychId)
  }

  return {
    ok: true,
    updates: [...touched].map((id) => {
      const doc = working.get(id)
      return { triptychId: id, printSets: doc?.printSets ?? [] }
    }),
  }
}
