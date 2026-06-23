'use client'

import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'

export type InstallationImageSlide = {
  url: string
  alt: string
  caption?: string | null
  width: number
  height: number
}

export function EventInstallationGallery({ slides }: { slides: InstallationImageSlide[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const close = useCallback(() => setActiveIndex(null), [])
  const showPrev = useCallback(() => {
    setActiveIndex((index) => {
      if (index === null || slides.length === 0) return index
      return (index - 1 + slides.length) % slides.length
    })
  }, [slides.length])
  const showNext = useCallback(() => {
    setActiveIndex((index) => {
      if (index === null || slides.length === 0) return index
      return (index + 1) % slides.length
    })
  }, [slides.length])

  useEffect(() => {
    if (activeIndex === null) return undefined

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
      if (event.key === 'ArrowLeft') showPrev()
      if (event.key === 'ArrowRight') showNext()
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [activeIndex, close, showNext, showPrev])

  if (slides.length === 0) return null

  const activeSlide = activeIndex === null ? null : slides[activeIndex]

  return (
    <>
      <section className="event-page__masonry" aria-label="Installation images">
        {slides.map((slide, index) => (
          <button
            key={`${slide.url}-${index}`}
            type="button"
            className="event-page__masonry-item"
            onClick={() => setActiveIndex(index)}
            aria-label={slide.caption?.trim() || slide.alt || 'View installation photo'}
          >
            <Image
              src={slide.url}
              alt={slide.alt}
              width={slide.width}
              height={slide.height}
              className="event-page__masonry-image"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </button>
        ))}
      </section>

      {activeSlide ?
        <div
          className="event-page__lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Installation photo"
          onClick={close}
        >
          <div
            className="event-page__lightbox-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="event-page__lightbox-close"
              onClick={close}
              aria-label="Close"
            >
              ×
            </button>
            {slides.length > 1 ?
              <button
                type="button"
                className="event-page__lightbox-nav event-page__lightbox-nav--prev"
                onClick={showPrev}
                aria-label="Previous photo"
              >
                ‹
              </button>
            : null}
            <Image
              src={activeSlide.url}
              alt={activeSlide.alt}
              width={activeSlide.width}
              height={activeSlide.height}
              className="event-page__lightbox-image"
              sizes="100vw"
              priority
            />
            {slides.length > 1 ?
              <button
                type="button"
                className="event-page__lightbox-nav event-page__lightbox-nav--next"
                onClick={showNext}
                aria-label="Next photo"
              >
                ›
              </button>
            : null}
            {activeSlide.caption?.trim() ?
              <p className="event-page__lightbox-caption">{activeSlide.caption.trim()}</p>
            : null}
          </div>
        </div>
      : null}
    </>
  )
}
