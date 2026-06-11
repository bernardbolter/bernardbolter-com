'use client'

import { useMemo, useRef, useState } from 'react'
import Draggable from 'react-draggable'

import type { ArtworkGalleryImage } from '@/lib/artwork/artworkGalleryImages'

type Props = {
  image: ArtworkGalleryImage
  onClose: () => void
}

export default function MagnifyOverlay({ image, onClose }: Props) {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const nodeRef = useRef<HTMLDivElement>(null)

  const showMinimap = useMemo(() => {
    if (typeof window === 'undefined') return false
    return image.width > window.innerWidth * 0.9 || image.height > window.innerHeight * 0.9
  }, [image.width, image.height])

  return (
    <div className="magnify-overlay" role="dialog" aria-modal="true" aria-label="Magnified artwork">
      <button
        type="button"
        className="magnify-overlay__close rounded bg-white/10 px-3 py-1 text-sm text-white"
        onClick={onClose}
      >
        Close
      </button>
      <div className="magnify-overlay__viewport">
        <Draggable
          nodeRef={nodeRef}
          position={position}
          onStop={(_, data) => setPosition({ x: data.x, y: data.y })}
          bounds="parent"
        >
          <div ref={nodeRef}>
            <img
              src={image.url}
              alt={image.alt}
              width={image.width}
              height={image.height}
              className="max-w-none select-none"
              draggable={false}
            />
          </div>
        </Draggable>
      </div>
      {showMinimap ? (
        <div className="magnify-overlay__minimap overflow-hidden bg-black/40">
          <img
            src={image.url}
            alt=""
            className="h-full w-full object-contain opacity-70"
            draggable={false}
          />
          <div
            className="pointer-events-none absolute border border-white/80 bg-white/10"
            style={{
              width: '40%',
              height: '40%',
              left: `${Math.min(60, Math.max(0, 50 - position.x / 50))}%`,
              top: `${Math.min(60, Math.max(0, 50 - position.y / 50))}%`,
            }}
          />
        </div>
      ) : null}
    </div>
  )
}
