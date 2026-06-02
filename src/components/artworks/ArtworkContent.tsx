'use client'

import Link from 'next/link'
import ReactPlayer from 'react-player'

import ArtworkImage from '@/components/artworks/ArtworkImage'
import { CloseCircleSvg } from '@/components/icons'
import useWindowSize from '@/hooks/useWindowSize'
import type { Artwork, Media } from '@/payload-types'

interface ArtworkContentProps {
  artwork: Artwork
}

function readMediaUrl(media: number | Media | null | undefined): string | null {
  if (!media || typeof media !== 'object') return null
  return media.url ?? null
}

function getPrimaryVideoSource(artwork: Artwork): string | null {
  const directFile = readMediaUrl(artwork.videoFile)
  if (directFile) return directFile
  if (artwork.videoUrl) return artwork.videoUrl
  const clips = artwork.videos ?? []
  const preferred = clips.find((clip) => clip.videoRole === 'primary') ?? clips[0]
  if (!preferred) return null
  return readMediaUrl(preferred.videoFile) ?? preferred.videoUrl ?? null
}

export default function ArtworkContent({
  artwork,
}: ArtworkContentProps) {
  const size = useWindowSize()
  const viewportWidth = size.width || 1200
  const viewportHeight = size.height || 900
  const containerSize =
    viewportWidth >= 768 ? Math.max(1, viewportHeight - 125) : Math.max(1, viewportWidth - 50)
  const videoSrc = getPrimaryVideoSource(artwork)
  const mediumLabel = artwork.mediumOther?.trim() || artwork.medium.replaceAll('-', ' ')

  return (
    <div className="relative min-h-screen w-full bg-surface-page px-space-3 pb-space-3 pt-[3.25rem] m:px-space-6 m:pt-space-3">
      <Link
        href="/"
        className="fixed left-space-2 top-space-2 z-ui-top flex h-[2.125rem] items-center gap-space-2 rounded bg-surface-nav px-space-2 no-underline"
      >
        <span className="h-6 w-6 fill-dark">
          <CloseCircleSvg />
        </span>
        <span className="font-heading text-sm text-dark">close</span>
      </Link>

      <div className="mx-auto flex w-full max-w-grid flex-col items-center gap-space-4 m:flex-row m:items-start m:justify-center">
        <div
          className="flex items-center justify-center"
          style={{ width: containerSize, height: containerSize }}
        >
          {videoSrc ? (
            <div className="h-full w-full overflow-hidden bg-surface-panel-light">
              <ReactPlayer src={videoSrc} controls width="100%" height="100%" />
            </div>
          ) : (
            <ArtworkImage
              artwork={artwork}
              artworkContainerWidth={containerSize}
              artworkContainerHeight={containerSize}
              useImageFactors
              priority
            />
          )}
        </div>

        <aside className="w-full max-w-[28rem] overflow-hidden rounded">
          <div className="bg-surface-panel-light px-space-3 py-space-2">
            <h1 className="font-heading text-xl text-dark">{artwork.title}</h1>
          </div>
          <div className="bg-surface-panel-dark px-space-3 py-space-2">
            <p className="font-heading text-sm text-dark">
              {artwork.yearCreated}
              {artwork.yearCompleted && artwork.yearCompleted !== artwork.yearCreated
                ? ` - ${artwork.yearCompleted}`
                : ''}
            </p>
          </div>
          <div className="bg-surface-panel-light px-space-3 py-space-2">
            <p className="font-heading text-sm capitalize text-dark">{mediumLabel}</p>
          </div>
          {artwork.dimensionsDisplay && (
            <div className="bg-surface-panel-dark px-space-3 py-space-2">
              <p className="font-heading text-sm text-dark">{artwork.dimensionsDisplay}</p>
            </div>
          )}
          {artwork.descriptionShort && (
            <div className="bg-surface-panel-light px-space-3 py-space-2">
              <p className="font-heading text-sm text-dark">{artwork.descriptionShort}</p>
            </div>
          )}
          {artwork.descriptionLong && (
            <div className="bg-surface-panel-dark px-space-3 py-space-2">
              <div className="font-body text-sm text-dark">
                {typeof artwork.descriptionLong === 'object'
                  ? 'Extended description available.'
                  : String(artwork.descriptionLong)}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
