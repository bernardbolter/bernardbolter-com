'use client'

import Image from 'next/image'
import { useMemo, useRef, useState, type RefObject } from 'react'
import Draggable, { type DraggableData, type DraggableEvent } from 'react-draggable'

import {
  computeMagnifyMiniMap,
  getMagnifyDragBounds,
} from '@/lib/artwork/magnifyDisplay'
import type { DragPosition } from '@/lib/artwork/magnifyDisplay'
import type { ArtworkGalleryImage } from '@/lib/artwork/artworkGalleryImages'

type Props = {
  images: ArtworkGalleryImage[]
  activeIndex: number
  dragPositions: DragPosition[]
  onDrag: (index: number, position: DragPosition) => void
  onClose: () => void
  onImageLoaded?: (index: number) => void
  seriesColor: string
  blurDataURL?: string
  artworkTitle: string
}

export default function MagnifyOverlay({
  images,
  activeIndex,
  dragPositions,
  onDrag,
  onClose,
  onImageLoaded,
  seriesColor,
  blurDataURL,
  artworkTitle,
}: Props) {
  const nodeRefs = useRef<Array<RefObject<HTMLDivElement | null>>>([])
  const [loadingIndex, setLoadingIndex] = useState<number | null>(activeIndex)
  const [errorIndex, setErrorIndex] = useState<number | null>(null)

  if (nodeRefs.current.length !== images.length) {
    nodeRefs.current = images.map(() => ({ current: null }))
  }

  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 900
  const activeImage = images[activeIndex]
  const currentPosition = dragPositions[activeIndex] ?? { x: 0, y: 0 }

  const miniMap = useMemo(() => {
    if (!activeImage) return null
    const { canDrag } = getMagnifyDragBounds(
      viewportWidth,
      viewportHeight,
      activeImage.width,
      activeImage.height,
    )
    if (!canDrag) return null
    return computeMagnifyMiniMap({
      viewportWidth,
      viewportHeight,
      imageWidth: activeImage.width,
      imageHeight: activeImage.height,
      position: currentPosition,
    })
  }, [activeImage, currentPosition, viewportHeight, viewportWidth])

  if (!activeImage) return null

  return (
    <div className="artwork-image__magnify-overlay-wrapper" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="artwork-image__magnify-frame"
        style={{ width: viewportWidth, height: viewportHeight }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="artwork-image__magnify-slider-wrapper"
          style={{
            width: viewportWidth * images.length,
            transform: `translateX(-${activeIndex * viewportWidth}px)`,
          }}
        >
          {images.map((image, index) => {
            const nodeRef = nodeRefs.current[index]!
            const { bounds, canDrag } = getMagnifyDragBounds(
              viewportWidth,
              viewportHeight,
              image.width,
              image.height,
            )

            return (
              <div
                key={image.url}
                className="artwork-image__magnified-slide"
                style={{ width: viewportWidth, height: viewportHeight }}
              >
                <Draggable
                  nodeRef={nodeRef}
                  disabled={!canDrag}
                  bounds={bounds}
                  position={dragPositions[index] ?? { x: 0, y: 0 }}
                  onDrag={(event: DraggableEvent, data: DraggableData) =>
                    onDrag(index, { x: data.x, y: data.y })
                  }
                  onStop={(event: DraggableEvent, data: DraggableData) =>
                    onDrag(index, { x: data.x, y: data.y })
                  }
                >
                  <div
                    ref={nodeRef}
                    className="artwork-image__magnified-image-wrapper"
                    style={{
                      cursor: canDrag ? 'grab' : 'default',
                      width: image.width,
                      height: image.height,
                      background: seriesColor,
                    }}
                  >
                    <Image
                      src={image.url}
                      alt={image.alt}
                      width={image.width}
                      height={image.height}
                      quality={100}
                      unoptimized
                      placeholder="blur"
                      blurDataURL={blurDataURL}
                      priority={index === activeIndex}
                      draggable={false}
                      style={{
                        objectFit: 'contain',
                        opacity: errorIndex === index ? 0 : 1,
                      }}
                      onLoad={() => {
                        onImageLoaded?.(index)
                        if (index === activeIndex) {
                          setLoadingIndex(null)
                          setErrorIndex(null)
                        }
                      }}
                      onError={() => {
                        if (index === activeIndex) {
                          setLoadingIndex(null)
                          setErrorIndex(index)
                        }
                      }}
                    />
                    {index === activeIndex && (loadingIndex === index || errorIndex === index) ? (
                      <div className="artwork-image__loading-text">
                        {errorIndex === index ? (
                          <>
                            <p>{artworkTitle}</p>
                            <p>high-resolution image failed to load</p>
                          </>
                        ) : (
                          <>
                            <p>loading high-resolution</p>
                            <p>{`${artworkTitle}...`}</p>
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
                </Draggable>
              </div>
            )
          })}
        </div>

        {miniMap ? (
          <div
            className="artwork-image__mini-map-container"
            style={{ width: miniMap.miniMapSize, height: miniMap.miniMapSize }}
          >
            <div
              className="artwork-image__mini-map-image-outline"
              style={{
                width: miniMap.mapImgW,
                height: miniMap.mapImgH,
                transform: `translate(${miniMap.finalImgTranslateX}px, ${miniMap.finalImgTranslateY}px)`,
              }}
            />
            <div
              className="artwork-image__mini-map-viewport-box"
              style={{
                width: miniMap.viewScaleW,
                height: miniMap.viewScaleH,
                transform: `translate(${miniMap.fixedBoxPosX}px, ${miniMap.fixedBoxPosY}px)`,
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
