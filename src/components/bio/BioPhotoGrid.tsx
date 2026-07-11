'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  ArtworkPauseSvg,
  ArtworkTimerSvg,
  CloseCircleSvg,
  LeftArrowSvg,
} from '@/components/icons'
import type { BioPageImage } from '@/helpers/bioPhotos'

import BioPhotoItem from './BioPhotoItem'

interface BioPhotoGridProps {
  images: BioPageImage[]
}

interface LightboxState {
  isOpen: boolean
  currentIndex: number
}

export default function BioPhotoGrid({ images }: BioPhotoGridProps) {
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
      const captionHeight = image.caption ? 20 : 0
      const totalHeight = imageHeight + (captionHeight > 0 ? captionHeight + gap : 0)
      const rowSpan = Math.ceil((totalHeight + gap) / (rowHeight + gap))

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

  if (images.length === 0) return null

  const currentLightboxImage = images[lightbox.currentIndex]

  return (
    <>
      <div ref={masonryRef} className="bio__masonry-grid">
        {images.map((image, index) => {
          const spans = masonrySpans[index] ?? { colSpan: 1, rowSpan: 40 }
          return (
            <BioPhotoItem
              key={image.id}
              image={image}
              colSpan={spans.colSpan}
              rowSpan={spans.rowSpan}
              onOpen={() => openLightbox(index)}
            />
          )
        })}
      </div>

      {lightbox.isOpen && currentLightboxImage ? (
        <div
          className={`lightbox__overlay ${lightbox.isOpen ? 'lightbox__overlay--open' : ''}`}
          onClick={closeLightbox}
        >
          <div className="lightbox__content" onClick={(event) => event.stopPropagation()}>
            <div className="lightbox__image-wrapper">
              <img
                src={currentLightboxImage.url}
                alt={currentLightboxImage.alt}
                width={currentLightboxImage.width}
                height={currentLightboxImage.height}
                decoding="async"
                style={{
                  objectFit: 'contain',
                  width: '100%',
                  height: 'auto',
                  maxHeight: '85vh',
                }}
              />
            </div>

            {currentLightboxImage.caption ? (
              <div className="lightbox__alt-text">{currentLightboxImage.caption}</div>
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
    </>
  )
}
