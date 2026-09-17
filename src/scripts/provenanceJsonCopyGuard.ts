/** Guards for the one-off jsonb → array provenance copy. */

export const PROVENANCE_COPY_MARKER_TABLE = 'schema_reconciliation_provenance'
export const PROVENANCE_COPY_MARKER_ID = 'json-to-arrays'

export type JsonCopySkipReason = 'marker' | 'existing-rows'

/**
 * Skip the jsonb copy when a previous run already completed, or when the
 * destination tables already have rows (the live double-run: DDL-exists
 * check passed, DML still inserted because ids were random UUIDs).
 *
 * A partial first run that created empty tables and crashed before any
 * INSERT is not skipped — `_parent_id,_order` uniqueness then makes a
 * retry a no-op for rows that did land.
 */
export function jsonCopySkipReason(opts: {
  markerExists: boolean
  ownershipRows: number
  loanRows: number
  confidenceRows: number
}): JsonCopySkipReason | null {
  if (opts.markerExists) return 'marker'
  const destRows = opts.ownershipRows + opts.loanRows + opts.confidenceRows
  if (destRows > 0) return 'existing-rows'
  return null
}

export function parentOrderUniqueIndexName(tableName: string): string {
  return `${tableName}_parent_order_uidx`
}
