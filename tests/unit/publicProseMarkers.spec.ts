import { describe, expect, it } from 'vitest'

import { findPublicProseMarkers } from '../../src/lib/artwork/publicProseMarkers'

describe('findPublicProseMarkers', () => {
  it('flags the Vesuvios NOTE aside', () => {
    const text =
      'Exhibited at Vesuvios (title confirmed at that show). NOTE: this fact should migrate to an Events-collection relation once that path is used for this record, rather than staying in this free-text field long-term.'
    expect(findPublicProseMarkers(text)).toEqual(
      expect.arrayContaining(['NOTE:', 'should migrate']),
    )
  })

  it('returns empty for clean public prose', () => {
    expect(
      findPublicProseMarkers(
        'Painted directly onto raw, unprimed canvas — gesso was not yet known at this stage of the practice.',
      ),
    ).toEqual([])
  })
})
