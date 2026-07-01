import { describe, expect, it } from 'vitest'

import { getArtworkViewportLayout, getSsrArtworkViewportLayout } from '@/helpers/artworkViewportLayout'
import { createInitialArtworksState } from '@/types/frontend'
import type { Artwork } from '@/payload-types'

describe('artworkViewportLayout', () => {
  it('uses desktop container sizing at SSR defaults', () => {
    const layout = getSsrArtworkViewportLayout()

    expect(layout.viewportWidth).toBe(1440)
    expect(layout.viewportHeight).toBe(900)
    expect(layout.artworkContainerWidth).toBe(775)
    expect(layout.artworkContainerHeight).toBe(775)
    expect(layout.artworkDesktopSideWidth).toBe(332.5)
  })

  it('uses mobile container sizing below 768px', () => {
    const layout = getArtworkViewportLayout(390, 844)

    expect(layout.artworkContainerWidth).toBe(340)
    expect(layout.artworkDesktopSideWidth).toBe(0)
  })
})

describe('createInitialArtworksState', () => {
  it('precomputes formattedArtworks for SSR when artworks exist', () => {
    const artwork = {
      id: '1',
      title: 'Basel Switzerland',
      slug: 'basel-switzerland',
      status: 'published',
      yearCreated: 2007,
      primaryImage: { url: '/media/basel.jpg', width: 800, height: 600 },
    } as unknown as Artwork

    const state = createInitialArtworksState([artwork])

    expect(state.viewportWidth).toBeGreaterThan(0)
    expect(state.formattedArtworks).not.toBeNull()
    expect(state.formattedArtworks?.artworksArray.length).toBe(1)
  })

  it('leaves formattedArtworks null when catalogue is empty', () => {
    const state = createInitialArtworksState([])

    expect(state.formattedArtworks).toBeNull()
  })
})
