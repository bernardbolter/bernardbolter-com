import { describe, expect, it } from 'vitest'

import { DROP_CAP_MIN_CHARS, statementProseHasDropCap } from '@/lib/statement/statementDropCap'

describe('statementProseHasDropCap', () => {
  it('requires at least DROP_CAP_MIN_CHARS in the first paragraph', () => {
    const short = {
      root: {
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'text', text: 'Too short.' }],
          },
        ],
      },
    }

    const longText = 'x'.repeat(DROP_CAP_MIN_CHARS)
    const long = {
      root: {
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'text', text: longText }],
          },
        ],
      },
    }

    expect(statementProseHasDropCap(short)).toBe(false)
    expect(statementProseHasDropCap(long)).toBe(true)
  })
})
