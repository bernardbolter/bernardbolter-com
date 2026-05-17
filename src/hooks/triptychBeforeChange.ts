import type { CollectionBeforeChangeHook } from 'payload'

type PrintSetRow = {
  edition?: number | null
  printAvailableCount?: number | null
  vendureProductId?: string | null
  size?: 'large' | 'small' | null
}

/**
 * Initialise `printAvailableCount` from `edition` on create when not set.
 * Webhook is the only other writer for `printAvailableCount` after launch.
 */
export const triptychBeforeChange: CollectionBeforeChangeHook = ({ data }) => {
  if (!data || !Array.isArray(data.printSets)) return data

  data.printSets = (data.printSets as PrintSetRow[]).map((row) => {
    if (row == null || typeof row !== 'object') return row
    const edition = row.edition
    if (
      (row.printAvailableCount == null || row.printAvailableCount === undefined) &&
      typeof edition === 'number' &&
      !Number.isNaN(edition)
    ) {
      return { ...row, printAvailableCount: edition }
    }
    return row
  })

  return data
}
