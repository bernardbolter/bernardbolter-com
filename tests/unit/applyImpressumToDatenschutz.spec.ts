import { describe, expect, it } from 'vitest'

import { buildDatenschutzLexicalEn } from '@/content/datenschutzPolicy'
import { applyImpressumToDatenschutz } from '@/lib/legal/applyImpressumToDatenschutz'
import { lexicalToPlain } from '@/lib/artOfficial/lexicalToPlain'

describe('applyImpressumToDatenschutz', () => {
  it('replaces controller address and mailto from artist impressum', () => {
    const content = applyImpressumToDatenschutz(buildDatenschutzLexicalEn(), {
      legalName: 'Test Artist',
      streetAddress: 'Example Str. 1',
      postalCode: '10115',
      city: 'Berlin',
      country: 'Germany',
      publicEmail: 'studio@example.com',
    }, 'en')

    const plain = lexicalToPlain(content)
    expect(plain).toContain('Test Artist')
    expect(plain).toContain('Example Str. 1')
    expect(plain).toContain('10115 Berlin Germany')
    expect(plain).toContain('studio@example.com')
    expect(plain).not.toContain('bernardbolter@gmail.com')
  })
})
