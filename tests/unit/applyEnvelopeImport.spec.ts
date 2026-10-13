import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Artist, User } from '@/payload-types'

const mocks = vi.hoisted(() => ({
  applyArtworkFieldsImport: vi.fn(),
  revalidateArtworkPaths: vi.fn(),
}))

vi.mock('@/lib/studio/applyArtworkFieldsImport', () => ({
  applyArtworkFieldsImport: mocks.applyArtworkFieldsImport,
}))

vi.mock('@/lib/studio/revalidateArtworkPaths', () => ({
  revalidateArtworkPaths: mocks.revalidateArtworkPaths,
}))

import { applyEnvelopeImport } from '@/lib/studio/applyEnvelopeImport'

const user = { id: 1, roles: ['admin'] } as User

function buildPayloadForMixedResult() {
  return {
    find: vi.fn(async (args: Record<string, unknown>) => {
      if (args.collection === 'artists') {
        return { docs: [{ id: 7, bioTimelineEntries: [], statementThroughlines: [] }] }
      }
      if (args.collection === 'sessions') {
        return { docs: [] }
      }
      if (args.collection === 'artworks') {
        return { docs: [] }
      }
      return { docs: [] }
    }),
    update: vi.fn(),
    create: vi.fn(),
  } as never
}

function buildPayloadForIdempotency() {
  const artist: Partial<Artist> = {
    id: 9,
    bioTimelineEntries: [],
    statementThroughlines: [],
  }

  const payload = {
    find: vi.fn(async (args: Record<string, unknown>) => {
      if (args.collection === 'artists') return { docs: [artist] }
      if (args.collection === 'artworks') {
        return { docs: [{ id: 44, slug: 'the-thinker' }] }
      }
      return { docs: [] }
    }),
    update: vi.fn(async (args: Record<string, unknown>) => {
      if (args.collection === 'artists') {
        const data = (args.data ?? {}) as { bioTimelineEntries?: unknown; statementThroughlines?: unknown }
        if (data.bioTimelineEntries) {
          artist.bioTimelineEntries = data.bioTimelineEntries as Artist['bioTimelineEntries']
        }
        if (data.statementThroughlines) {
          artist.statementThroughlines = data.statementThroughlines as Artist['statementThroughlines']
        }
      }
      return {}
    }),
    create: vi.fn(),
  } as never

  return { payload, artist }
}

function buildPayloadForSessionUpsert() {
  let sessionDoc: Record<string, unknown> | null = null
  let nextId = 100

  const payload = {
    find: vi.fn(async (args: Record<string, unknown>) => {
      if (args.collection === 'artists') {
        return { docs: [{ id: 7, bioTimelineEntries: [], statementThroughlines: [] }] }
      }
      if (args.collection === 'sessions') {
        return { docs: sessionDoc ? [{ id: sessionDoc.id, sessionId: sessionDoc.sessionId }] : [] }
      }
      if (args.collection === 'artworks') {
        return { docs: [{ id: 44, slug: 'the-thinker' }] }
      }
      return { docs: [] }
    }),
    create: vi.fn(async (args: Record<string, unknown>) => {
      const data = (args.data ?? {}) as Record<string, unknown>
      sessionDoc = { id: nextId++, ...data }
      return sessionDoc
    }),
    update: vi.fn(async (args: Record<string, unknown>) => {
      const data = (args.data ?? {}) as Record<string, unknown>
      sessionDoc = { ...(sessionDoc ?? { id: nextId++, sessionId: 'missing' }), ...data }
      return sessionDoc
    }),
  } as never

  return {
    payload,
    getSessionDoc: () => sessionDoc,
  }
}

describe('applyEnvelopeImport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.applyArtworkFieldsImport.mockResolvedValue([
      { slug: 'the-thinker', artworkId: 1, fieldsApplied: [] },
    ])
  })

  it('returns mixed per-write results (non-atomic)', async () => {
    const payload = buildPayloadForMixedResult()
    const results = await applyEnvelopeImport(payload, user, {
      writes: [
        {
          collection: 'artworks',
          slug: 'the-thinker',
          operation: 'set',
          fields: { intent: 'Push against monumentality' },
        },
        {
          collection: 'statement-throughlines',
          operation: 'append',
          entry: {
            text: 'Persistent structural hesitation.',
            sourceSessionRef: 'missing-session',
          },
        },
      ],
    })

    expect(results).toEqual([
      { collection: 'artworks', slug: 'the-thinker', status: 'saved' },
      {
        collection: 'statement-throughlines',
        status: 'failed',
        reason: expect.stringMatching(/Session not found/),
      },
    ])
  })

  it('skips duplicate bio append for same sourceSessionRef + text', async () => {
    const { payload, artist } = buildPayloadForIdempotency()

    const input = {
      sourceSessionRef: 123,
      writes: [
        {
          collection: 'bio-timeline' as const,
          operation: 'append' as const,
          entry: {
            eventDate: '1993',
            text: 'First articulation of a recurring concern.',
            linkedArtworkSlugs: ['the-thinker'],
          },
        },
      ],
    }

    const first = await applyEnvelopeImport(payload, user, input)
    const second = await applyEnvelopeImport(payload, user, input)

    expect(first[0]).toMatchObject({ collection: 'bio-timeline', status: 'saved' })
    expect(second[0]).toMatchObject({
      collection: 'bio-timeline',
      status: 'skipped',
      reason: 'duplicate entry',
    })
    expect(artist.bioTimelineEntries).toHaveLength(1)
  })

  it('strips reasoningStatus from artwork writes (derived field)', async () => {
    const payload = buildPayloadForMixedResult()

    const results = await applyEnvelopeImport(payload, user, {
      writes: [
        {
          collection: 'artworks',
          slug: 'the-thinker',
          operation: 'set',
          fields: {
            intent: 'Consolidates structural motifs.',
            reasoningStatus: 'complete',
          },
        },
      ],
    })

    expect(mocks.applyArtworkFieldsImport).toHaveBeenCalledTimes(1)
    expect(mocks.applyArtworkFieldsImport).toHaveBeenCalledWith(
      payload,
      user,
      expect.objectContaining({
        slug: 'the-thinker',
        fields: { intent: 'Consolidates structural motifs.' },
      }),
    )
    expect(results[0]).toMatchObject({
      collection: 'artworks',
      slug: 'the-thinker',
      status: 'saved',
      warnings: expect.arrayContaining([
        expect.stringContaining('reasoningStatus is derived'),
      ]),
    })
    expect(mocks.revalidateArtworkPaths).toHaveBeenCalledWith('the-thinker')
  })

  it('ignores reasoningStatus-only artwork writes without calling field import', async () => {
    const payload = buildPayloadForMixedResult()

    const results = await applyEnvelopeImport(payload, user, {
      writes: [
        {
          collection: 'artworks',
          slug: 'the-thinker',
          operation: 'set',
          fields: { reasoningStatus: 'complete' },
        },
      ],
    })

    expect(mocks.applyArtworkFieldsImport).not.toHaveBeenCalled()
    expect(results[0]).toMatchObject({
      collection: 'artworks',
      slug: 'the-thinker',
      status: 'saved',
      warnings: expect.arrayContaining([
        expect.stringContaining('reasoningStatus is derived'),
      ]),
    })
    expect(mocks.revalidateArtworkPaths).toHaveBeenCalledWith('the-thinker')
  })

  it('keeps session in-progress and replaces messages on upsert', async () => {
    const { payload, getSessionDoc } = buildPayloadForSessionUpsert()

    const first = await applyEnvelopeImport(payload, user, {
      writes: [
        {
          collection: 'sessions',
          operation: 'set',
          sessionId: 'resume-me',
          fields: {
            sessionType: 'artwork',
            status: 'in-progress',
            primaryArtwork: 'the-thinker',
            messages: [
              { role: 'user', content: 'Turn 1' },
              { role: 'assistant', content: 'Reply 1' },
            ],
          },
        },
      ],
    })
    expect(first[0]).toMatchObject({
      collection: 'sessions',
      sessionId: 'resume-me',
      status: 'saved',
    })
    expect(payload.create).toHaveBeenCalledTimes(1)
    expect(getSessionDoc()?.status).toBe('in-progress')
    expect(getSessionDoc()?.messages).toEqual([
      { role: 'user', content: 'Turn 1' },
      { role: 'assistant', content: 'Reply 1' },
    ])

    const second = await applyEnvelopeImport(payload, user, {
      writes: [
        {
          collection: 'sessions',
          operation: 'set',
          sessionId: 'resume-me',
          fields: {
            sessionType: 'artwork',
            status: 'in-progress',
            primaryArtwork: 'the-thinker',
            messages: [{ role: 'user', content: 'Turn 2 only' }],
          },
        },
      ],
    })
    expect(second[0]).toMatchObject({
      collection: 'sessions',
      sessionId: 'resume-me',
      status: 'saved',
    })
    expect(payload.update).toHaveBeenCalled()
    expect(getSessionDoc()?.status).toBe('in-progress')
    expect(getSessionDoc()?.messages).toEqual([{ role: 'user', content: 'Turn 2 only' }])
  })
})
