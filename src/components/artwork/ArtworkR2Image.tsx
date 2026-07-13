'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ImgHTMLAttributes,
  type SyntheticEvent,
} from 'react'

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError'> & {
  src: string
  fallbackSrc: string
  /** Fires only when both src and fallbackSrc fail to load. */
  onError?: () => void
}

function fireLoadIfComplete(
  img: HTMLImageElement | null,
  onLoad: Props['onLoad'],
): void {
  if (!img?.complete || img.naturalWidth === 0) return
  onLoad?.({ target: img, currentTarget: img } as unknown as SyntheticEvent<HTMLImageElement>)
}

export default function ArtworkR2Image({
  src,
  fallbackSrc,
  onLoad,
  onError,
  ...props
}: Props) {
  const [currentSrc, setCurrentSrc] = useState(src)
  const [usedFallback, setUsedFallback] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    setCurrentSrc(src)
    setUsedFallback(false)
  }, [src])

  useLayoutEffect(() => {
    fireLoadIfComplete(imgRef.current, onLoad)
  }, [currentSrc, onLoad])

  const handleError = useCallback(() => {
    if (!usedFallback && fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc)
      setUsedFallback(true)
      return
    }
    onError?.()
  }, [currentSrc, fallbackSrc, onError, usedFallback])

  return (
    <img
      {...props}
      ref={imgRef}
      src={currentSrc}
      onError={handleError}
      onLoad={onLoad}
      style={props.style as CSSProperties | undefined}
    />
  )
}
