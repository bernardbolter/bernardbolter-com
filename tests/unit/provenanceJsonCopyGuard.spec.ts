import { describe, expect, it } from 'vitest'

import {
  jsonCopySkipReason,
  parentOrderUniqueIndexName,
  PROVENANCE_COPY_MARKER_ID,
} from '@/scripts/provenanceJsonCopyGuard'

describe('provenance json copy guard', () => {
  it('does not skip a first run (empty dest, no marker)', () => {
    expect(
      jsonCopySkipReason({
        markerExists: false,
        ownershipRows: 0,
        loanRows: 0,
        confidenceRows: 0,
      }),
    ).toBeNull()
  })

  it('skips when the completion marker exists', () => {
    expect(
      jsonCopySkipReason({
        markerExists: true,
        ownershipRows: 0,
        loanRows: 0,
        confidenceRows: 0,
      }),
    ).toBe('marker')
    expect(PROVENANCE_COPY_MARKER_ID).toBe('json-to-arrays')
  })

  it('skips when dest tables already have rows even without a marker', () => {
    expect(
      jsonCopySkipReason({
        markerExists: false,
        ownershipRows: 8,
        loanRows: 1,
        confidenceRows: 20,
      }),
    ).toBe('existing-rows')
  })

  it('names the unique index on (_parent_id, _order) not id', () => {
    expect(parentOrderUniqueIndexName('artworks_ownership_history')).toBe(
      'artworks_ownership_history_parent_order_uidx',
    )
  })
})
