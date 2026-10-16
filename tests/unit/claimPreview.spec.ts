import { describe, expect, it } from 'vitest'

import { splitClaimPreview, splitClaimSentences } from '@/lib/artist/claimPreview'

describe('claimPreview', () => {
  it('splits on sentence boundaries', () => {
    expect(
      splitClaimSentences('First claim. Evidence follows. More evidence.'),
    ).toEqual(['First claim.', 'Evidence follows.', 'More evidence.'])
  })

  it('shows a single sentence in full with no remainder', () => {
    expect(splitClaimPreview('Only one sentence here.')).toEqual({
      preview: 'Only one sentence here.',
      remainder: null,
    })
  })

  it('shows one sentence when the first is long enough', () => {
    const first =
      'Preconceived compositional rules are abandoned once the actual material leads the work somewhere unexpected and specific.'
    const rest = 'That pattern shows up across megacities and watercolours alike.'
    const { preview, remainder } = splitClaimPreview(`${first} ${rest}`)
    expect(preview).toBe(first)
    expect(remainder).toBe(rest)
    expect(`${preview} ${remainder}`).toBe(`${first} ${rest}`)
  })

  it('takes two sentences when the first is short', () => {
    const { preview, remainder } = splitClaimPreview(
      'Short claim. Second sentence of evidence. Third stays hidden.',
    )
    expect(preview).toBe('Short claim. Second sentence of evidence.')
    expect(remainder).toBe('Third stays hidden.')
  })
})
