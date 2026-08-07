import { describe, expect, it } from 'vitest'

import { resolveRecordCataloguingLabel } from '@/lib/artwork/recordCataloguingLabel'
import type { Artwork } from '@/payload-types'

function artwork(overrides: Partial<Artwork> = {}): Artwork {
  return {
    id: 1,
    title: 'Test',
    slug: 'test',
    status: 'published',
    updatedAt: '2024-01-01T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  } as Artwork
}

describe('resolveRecordCataloguingLabel', () => {
  it('labels true stubs (image + title only) as not yet fully catalogued', () => {
    expect(
      resolveRecordCataloguingLabel(artwork({ reasoningStatus: 'stub' })),
    ).toBe('Record not yet fully catalogued')
    expect(resolveRecordCataloguingLabel(artwork({}))).toBe(
      'Record not yet fully catalogued',
    )
  })

  it('does not call prose-filled stub records incomplete', () => {
    expect(
      resolveRecordCataloguingLabel(
        artwork({
          reasoningStatus: 'stub',
          intent: 'A full intent line.',
          makingNote: 'How it was made.',
        }),
      ),
    ).toBeNull()
  })

  it('keeps Art/Official complete and partial copy when prose exists', () => {
    expect(
      resolveRecordCataloguingLabel(
        artwork({ reasoningStatus: 'complete', intent: 'Catalogued.' }),
      ),
    ).toBe('Record fully catalogued via Art/Official')
    expect(
      resolveRecordCataloguingLabel(
        artwork({ reasoningStatus: 'partial', makingNote: 'In progress.' }),
      ),
    ).toBe('Record partially catalogued')
  })
})
