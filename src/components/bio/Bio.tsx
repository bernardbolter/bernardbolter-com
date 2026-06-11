'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  ArtworkPauseSvg,
  ArtworkTimerSvg,
  CloseCircleSvg,
  LeftArrowSvg,
} from '@/components/icons'
import HeaderTitle from '@/components/info/HeaderTitle'
import type { BioPageImage } from '@/helpers/bioPhotos'

interface BioProps {
  tagline?: string | null
  paragraphs: string[]
  images: BioPageImage[]
}

interface LightboxState {
  isOpen: boolean
  currentIndex: number
}

export default function Bio({ tagline, paragraphs, images }: BioProps) {
  const masonryRef = useRef<HTMLDivElement>(null)
  const [masonrySpans, setMasonrySpans] = useState<{ colSpan: number; rowSpan: number }[]>([])
  const [lightbox, setLightbox] = useState<LightboxState>({ isOpen: false, currentIndex: 0 })
  const [lightboxPlaying, setLightboxPlaying] = useState(true)
  const [timerProgress, setTimerProgress] = useState(0)

  const openLightbox = useCallback((index: number) => {
    setLightbox({ isOpen: true, currentIndex: index })
    setLightboxPlaying(true)
    setTimerProgress(0)
  }, [])

  const closeLightbox = useCallback(() => {
    setLightbox({ isOpen: false, currentIndex: 0 })
    setLightboxPlaying(false)
    setTimerProgress(0)
  }, [])

  const handleNextImage = useCallback(() => {
    setLightbox((prev) => ({
      ...prev,
      currentIndex: prev.currentIndex === images.length - 1 ? 0 : prev.currentIndex + 1,
    }))
    setTimerProgress(0)
  }, [images.length])

  const handlePrevImage = useCallback(() => {
    setLightbox((prev) => ({
      ...prev,
      currentIndex: prev.currentIndex === 0 ? images.length - 1 : prev.currentIndex - 1,
    }))
    setTimerProgress(0)
  }, [images.length])

  useEffect(() => {
    if (!lightbox.isOpen || !lightboxPlaying || images.length <= 1) {
      setTimerProgress(0)
      return
    }

    const INTERVAL = 4000
    const UPDATE_FREQUENCY = 50
    const INCREMENT = (100 / INTERVAL) * UPDATE_FREQUENCY

    let progress = 0

    const progressInterval = setInterval(() => {
      progress += INCREMENT
      if (progress >= 100) {
        progress = 0
        handleNextImage()
      }
      setTimerProgress(progress)
    }, UPDATE_FREQUENCY)

    return () => {
      clearInterval(progressInterval)
      setTimerProgress(0)
    }
  }, [handleNextImage, images.length, lightbox.isOpen, lightboxPlaying])

  const calculateMasonrySpans = useCallback((photoList: BioPageImage[]) => {
    if (!masonryRef.current || photoList.length === 0) return

    const grid = masonryRef.current
    const gridComputedStyle = window.getComputedStyle(grid)
    const gridWidth = grid.clientWidth
    const gap = parseFloat(gridComputedStyle.gap) || 7
    const rowHeight = parseFloat(gridComputedStyle.gridAutoRows) || 7
    const columnCount = gridComputedStyle.gridTemplateColumns.split(' ').length
    const totalGapWidth = gap * (columnCount - 1)
    const columnWidth = (gridWidth - totalGapWidth) / columnCount

    const spans = photoList.map((image) => {
      const aspect = image.width / image.height

      let colSpan = 1
      if (columnCount >= 3) {
        if (aspect > 2) colSpan = 3
        else if (aspect > 1.4) colSpan = 2
      } else if (columnCount === 2 && aspect > 1.5) {
        colSpan = 2
      }

      const imageWidth = columnWidth * colSpan + gap * (colSpan - 1)
      const imageHeight = imageWidth / aspect
      const rowSpan = Math.ceil((imageHeight + gap) / (rowHeight + gap))

      return { colSpan, rowSpan }
    })

    setMasonrySpans(spans)
  }, [])

  useEffect(() => {
    if (images.length === 0) return

    const handleResize = () => {
      calculateMasonrySpans(images)
    }

    const timer = window.setTimeout(() => {
      calculateMasonrySpans(images)
    }, 100)

    window.addEventListener('resize', handleResize)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('resize', handleResize)
    }
  }, [calculateMasonrySpans, images])

  const currentLightboxImage = images[lightbox.currentIndex]

  return (
    <div className="bio-container">
      <HeaderTitle title="BIO" large={false} />

      <Link href="/" className="bio__close-container">
        <CloseCircleSvg />
        <p>close</p>
      </Link>

      <div className="bio__content-container">
        {tagline ? <h2 className="bio__tagline">{tagline}</h2> : null}
        {paragraphs.length > 0 ? (
          <div className="bio__main-content">
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        ) : null}
      </div>

      {images.length > 0 ? (
        <div ref={masonryRef} className="bio__masonry-grid">
          {images.map((image, index) => {
            const spans = masonrySpans[index] ?? { colSpan: 1, rowSpan: 40 }
            return (
              <div
                key={image.id}
                className="bio__masonry-item"
                style={{
                  gridColumn: `span ${spans.colSpan}`,
                  gridRow: `span ${spans.rowSpan}`,
                }}
                onClick={() => openLightbox(index)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    openLightbox(index)
                  }
                }}
              >
                <Image
                  src={image.url}
                  alt={image.alt}
                  fill
                  style={{ objectFit: 'cover' }}
                  sizes="(max-width:549px) 100vw, (max-width:978px) 50vw, 33vw"
                  className="bio__image-masonry"
                />
              </div>
            )
          })}
        </div>
      ) : null}

      {lightbox.isOpen && currentLightboxImage ? (
        <div
          className={`lightbox__overlay ${lightbox.isOpen ? 'lightbox__overlay--open' : ''}`}
          onClick={closeLightbox}
        >
          <div className="lightbox__content" onClick={(event) => event.stopPropagation()}>
            <div className="lightbox__image-wrapper">
              <Image
                src={currentLightboxImage.url}
                alt={currentLightboxImage.alt}
                width={currentLightboxImage.width}
                height={currentLightboxImage.height}
                style={{
                  objectFit: 'contain',
                  width: '100%',
                  height: 'auto',
                  maxHeight: '85vh',
                }}
                quality={95}
                priority
              />
            </div>

            {currentLightboxImage.alt ? (
              <div className="lightbox__alt-text">{currentLightboxImage.alt}</div>
            ) : null}
          </div>

          {images.length > 1 ? (
            <div className="lightbox__controls">
              <div className="lightbox__close" onClick={closeLightbox}>
                <CloseCircleSvg />
              </div>
              <div className="lightbox__counter">
                <p>
                  {lightbox.currentIndex + 1} / {images.length}
                </p>
              </div>
              <div
                className="lightbox__nav-button"
                onClick={(event) => {
                  event.stopPropagation()
                  handlePrevImage()
                }}
                aria-label="Previous image"
              >
                <LeftArrowSvg isRight={false} />
              </div>
              <div
                className="lightbox__nav-button lightbox__nav-button--next"
                onClick={(event) => {
                  event.stopPropagation()
                  handleNextImage()
                }}
                aria-label="Next image"
              >
                <LeftArrowSvg isRight />
              </div>
              <div className="lightbox__nav-button" onClick={(event) => event.stopPropagation()}>
                <ArtworkPauseSvg
                  artworkPlaying={lightboxPlaying}
                  setArtworkPlaying={setLightboxPlaying}
                />
              </div>
              <div className="lightbox__nav-button lightbox__nav-button--timer">
                <ArtworkTimerSvg progress={timerProgress} />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
