import { describe, expect, it } from 'vitest'

import { resolvePreUploadStep } from '@/lib/artOfficial/preUploadGuide'

describe('resolvePreUploadStep', () => {
  it('defaults to step 1 before any assistant turn', () => {
    expect(
      resolvePreUploadStep({
        assistantTurns: 0,
        hasFirstImpression: false,
        awaitingAssistant: false,
      }),
    ).toBe(1)
  })

  it('uses session preUploadStep when set', () => {
    expect(
      resolvePreUploadStep({
        preUploadStep: 3,
        assistantTurns: 1,
        hasFirstImpression: false,
        awaitingAssistant: false,
      }),
    ).toBe(3)
  })

  it('advances while awaiting assistant when no session step', () => {
    expect(
      resolvePreUploadStep({
        assistantTurns: 1,
        hasFirstImpression: false,
        awaitingAssistant: true,
      }),
    ).toBe(2)
  })
})
