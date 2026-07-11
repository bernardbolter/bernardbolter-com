import { describe, expect, it } from 'vitest'

import { parseImportJson } from '@/lib/studio/parseImportJson'

describe('parseImportJson', () => {
  it('parses plain JSON', () => {
    expect(parseImportJson('{"slug":"gates-iii"}')).toEqual({ slug: 'gates-iii' })
  })

  it('parses fenced JSON from Claude', () => {
    const raw = '```json\n{"slug":"gates-iii","analyses":[]}\n```'
    expect(parseImportJson(raw)).toEqual({ slug: 'gates-iii', analyses: [] })
  })

  it('throws when empty', () => {
    expect(() => parseImportJson('   ')).toThrow(/Paste JSON first/)
  })
})
