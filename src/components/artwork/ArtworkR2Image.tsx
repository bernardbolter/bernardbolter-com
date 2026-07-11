'use client'

import { useCallback, useState, type CSSProperties, type ImgHTMLAttributes } from 'react'

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError'> & {
  src: string
  fallbackSrc: string
}

export default function ArtworkR2Image({
  src,
  fallbackSrc,
  onLoad,
  ...props
}: Props) {
  const [currentSrc, setCurrentSrc] = useState(src)
  const [usedFallback, setUsedFallback] = useState(false)

  const handleError = useCallback(() => {
    if (!usedFallback && fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc)
      setUsedFallback(true)
    }
  }, [currentSrc, fallbackSrc, usedFallback])

  return (
    <img
      {...props}
      src={currentSrc}
      onError={handleError}
      onLoad={onLoad}
      style={props.style as CSSProperties | undefined}
    />
  )
}
