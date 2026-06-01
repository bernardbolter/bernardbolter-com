import { describe, expect, it } from 'vitest'

import { formatPayloadValidationError } from '@/lib/artOfficial/formatPayloadValidationError'

describe('formatPayloadValidationError', () => {
  it('surfaces postgres not-null constraint failures', () => {
    const message = formatPayloadValidationError({
      message: 'Failed query: insert into artworks…',
      cause: {
        code: '23502',
        column: 'megacities_series_series_type',
        message:
          'null value in column "megacities_series_series_type" of relation "artworks" violates not-null constraint',
      },
    })

    expect(message).toMatch(/megacities_series_series_type/)
  })
})
