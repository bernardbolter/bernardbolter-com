import { describe, expect, it, vi } from 'vitest'

import { buildSystemPrompt } from '@/lib/artOfficial/buildSystemPrompt'

describe('buildSystemPrompt', () => {
  it('assembles identity, knowledge, dialogue rules, and field roadmap', async () => {
    const payload = {
      findByID: vi.fn().mockResolvedValue({
        id: 1,
        name: 'Bernard Bolter',
        website: 'https://bernardbolter.com',
        careerStage: 'studio',
      }),
      find: vi.fn().mockResolvedValue({
        docs: [
          {
            sectionLabel: 'Biography',
            content: {
              root: {
                children: [
                  {
                    type: 'paragraph',
                    children: [{ type: 'text', text: 'Bio text' }],
                  },
                ],
              },
            },
          },
          {
            sectionLabel: 'Artist statement',
            content: {
              root: {
                children: [
                  {
                    type: 'paragraph',
                    children: [{ type: 'text', text: 'Statement text' }],
                  },
                ],
              },
            },
          },
        ],
      }),
    }

    const user = { id: 1, roles: ['admin'] } as never

    const output = await buildSystemPrompt({
      payload: payload as never,
      user,
      sessionType: 'artwork-cataloguing',
      artistId: 1,
    })

    expect(output).toContain('IDENTITY AND ROLE')
    expect(output).toContain('## Biography')
    expect(output).toContain('Bio text')
    expect(output).toContain('## Artist statement')
    expect(output).toContain('DIALOGUE RULES')
    expect(output).toContain('FIELD ROADMAP')
    expect(output).toContain('DORMANT (silently skip')
    expect(output).toContain('auctionEstimateHistory')
  })
})
