import { describe, expect, it } from 'vitest'

import { formatDbError } from '@/lib/studio/formatDbError'

describe('formatDbError', () => {
  it('appends nested cause messages (Payload Failed query wrappers)', () => {
    const err = Object.assign(new Error('Failed query: select "needs_artist_review" …'), {
      cause: new Error('column art_historical_references.needs_artist_review does not exist'),
    })
    expect(formatDbError(err)).toContain('needs_artist_review does not exist')
    expect(formatDbError(err)).toContain('Failed query')
  })
})
