import { describe, expect, it } from 'vitest'

import {
  buildPreUploadStateBlock,
  nextPreUploadStepAfterAnswer,
  resolvePreUploadStep,
} from '@/lib/artOfficial/preUploadGuide'

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

describe('nextPreUploadStepAfterAnswer', () => {
  it('advances from 1 to 2 on a real answer', () => {
    expect(
      nextPreUploadStepAfterAnswer({
        sessionType: 'artwork-cataloguing',
        preUploadStep: 1,
        hasFirstImpression: false,
        hasPrimaryImage: false,
        userMessage: 'Made in Berlin in 2017',
        isKickoffMessage: false,
      }),
    ).toBe(2)
  })

  it('does not advance on kickoff', () => {
    expect(
      nextPreUploadStepAfterAnswer({
        sessionType: 'artwork-cataloguing',
        preUploadStep: 1,
        hasFirstImpression: false,
        hasPrimaryImage: false,
        userMessage: "I'd like to catalogue an artwork.",
        isKickoffMessage: true,
      }),
    ).toBeNull()
  })

  it('does not advance past step 4', () => {
    expect(
      nextPreUploadStepAfterAnswer({
        sessionType: 'artwork-cataloguing',
        preUploadStep: 4,
        hasFirstImpression: false,
        hasPrimaryImage: false,
        userMessage: 'A long blind description…',
        isKickoffMessage: false,
      }),
    ).toBeNull()
  })
})

describe('buildPreUploadStateBlock', () => {
  it('names step 2 when preUploadStep is 2', () => {
    const block = buildPreUploadStateBlock({
      preUploadStep: 2,
      hasFirstImpression: false,
      hasPrimaryImage: false,
    })
    expect(block).toContain('step: 2 of 4')
    expect(block).toContain('Place in the body of work')
    expect(block).not.toContain('Relationship to time')
  })
})
