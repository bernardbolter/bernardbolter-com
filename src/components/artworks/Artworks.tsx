'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'

import { HomepageFlipProvider } from '@/components/artworks/homepageFlip'
import { formatCoverageLine } from '@/lib/artwork/catalogueIdentity'
import { useArtworks } from '@/providers/ArtworkProvider'
import ArtworksGrid from './ArtworksGrid'
import ArtworksSlideshow from './ArtworksSlideshow'
import ArtworkSwitcher from './ArtworkSwitcher'
import ArtworkTitle from './ArtworkTitle'
import Loading from './Loading'
import NoArtworks from './NoArtworks'
import Timeline from './Timeline'

export default function Artworks() {
  const [state] = useArtworks()
  const pathname = usePathname()
  const [flippedSlug, setFlippedSlug] = useState<string | null>(null)
  const showSwitcher = (state.viewportWidth || 0) >= 550 && !state.showSlideshow
  const currentSlug =
    state.formattedArtworks?.artworksArray[state.currentArtworkIndex]?.slug?.trim() ||
    state.filtered[state.currentArtworkIndex]?.slug?.trim() ||
    null

  useEffect(() => {
    setFlippedSlug(null)
  }, [state.artworkViewTimeline, state.showSlideshow])

  useEffect(() => {
    if (flippedSlug && currentSlug && flippedSlug !== currentSlug) {
      setFlippedSlug(null)
    }
  }, [currentSlug, flippedSlug])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFlippedSlug(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const summary = useMemo(() => {
    if (state.filtered.length === 0) return 'No artworks found'
    if (pathname === '/' && state.totalCount > 0) {
      return formatCoverageLine(state.totalCount, state.cataloguedCount)
    }
    return `${state.filtered.length} artworks`
  }, [pathname, state.cataloguedCount, state.filtered.length, state.totalCount])

  const isTimelineLoading =
    state.artworkViewTimeline &&
    !state.showSlideshow &&
    state.filtered.length > 0 &&
    !state.formattedArtworks

  if (isTimelineLoading) {
    return (
      <section className="relative z-artwork min-h-screen w-full">
        <Loading />
      </section>
    )
  }

  if (state.filtered.length === 0) {
    return <NoArtworks />
  }

  return (
    <HomepageFlipProvider value={{ flippedSlug, setFlippedSlug }}>
      <section className="relative z-artwork min-h-screen w-full">
        {showSwitcher && <ArtworkSwitcher />}

        <div className="fixed bottom-space-2 right-space-2 z-nav rounded bg-surface-nav/80 px-space-2 py-space-1 font-heading text-xs text-secondary">
          {summary}
        </div>

        {state.showSlideshow ? (
          <ArtworksSlideshow />
        ) : state.artworkViewTimeline || (state.viewportWidth || 0) < 550 ? (
          <Timeline />
        ) : (
          <ArtworksGrid />
        )}

        {state.totalCount > state.withImagesCount && (
          <div className="fixed bottom-[2.25rem] right-space-2 z-nav rounded bg-surface-nav/80 px-space-2 py-space-1 font-heading text-xs text-secondary">
            {state.totalCount - state.withImagesCount} items hidden (no image)
          </div>
        )}

        <ArtworkTitle />
      </section>
    </HomepageFlipProvider>
  )
}
