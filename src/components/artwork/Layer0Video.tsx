'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import { CloseCircleSvg } from '@/components/icons'
import YoutubePlainSvg from '@/components/icons/YoutubePlainSvg'
import useWindowSize from '@/hooks/useWindowSize'
import { getPrimaryVideoSource } from '@/lib/artwork/artworkGalleryImages'
import { formatArtworkYearRange, resolveWallLabelMedium } from '@/lib/artwork/artworkLabels'
import { lexicalToPlain } from '@/lib/artOfficial/lexicalToPlain'
import type { Artwork, Media } from '@/payload-types'

type Props = {
  artwork: Artwork
}

type WindowWithKlaro = Window & {
  klaro?: { show?: () => void; getManager?: () => { show?: () => void; getConsent?: (name: string) => boolean } }
}

function getKlaroConsent(): Record<string, boolean> {
  try {
    const cookie = document.cookie.split('; ').find((row) => row.startsWith('klaro='))
    if (!cookie) return {}
    return JSON.parse(decodeURIComponent(cookie.split('=')[1] ?? '{}')) as Record<string, boolean>
  } catch {
    return {}
  }
}

function readPosterDimensions(artwork: Artwork): { width: number; height: number } {
  const poster = artwork.posterImage
  if (poster && typeof poster === 'object') {
    const media = poster as Media
    return {
      width: media.width && media.width > 0 ? media.width : 1600,
      height: media.height && media.height > 0 ? media.height : 900,
    }
  }
  return { width: 1600, height: 900 }
}

function calculateVideoDisplayDimensions(
  videoWidth: number,
  videoHeight: number,
  containerWidth: number,
  containerHeight: number,
): { displayWidth: number; displayHeight: number } {
  const aspectRatio = videoWidth > 0 && videoHeight > 0 ? videoWidth / videoHeight : 16 / 9
  let scaledWidth = containerWidth
  let scaledHeight = scaledWidth / aspectRatio

  if (scaledHeight > containerHeight) {
    scaledHeight = containerHeight
    scaledWidth = scaledHeight * aspectRatio
  }

  return {
    displayWidth: Math.round(scaledWidth),
    displayHeight: Math.round(scaledHeight),
  }
}

export default function Layer0Video({ artwork }: Props) {
  const size = useWindowSize()
  const videoSource = getPrimaryVideoSource(artwork)
  const { width: intrinsicWidth, height: intrinsicHeight } = readPosterDimensions(artwork)
  const containerWidth = (size.width || 1200) * 0.9
  const containerHeight = (size.height || 900) * 0.9

  const { displayWidth, displayHeight } = useMemo(
    () =>
      calculateVideoDisplayDimensions(
        intrinsicWidth,
        intrinsicHeight,
        containerWidth,
        containerHeight,
      ),
    [containerHeight, containerWidth, intrinsicHeight, intrinsicWidth],
  )

  const topMargin = size.height ? (size.height - displayHeight) / 2 : 100
  const [consentGiven, setConsentGiven] = useState(false)
  const [klaroReady, setKlaroReady] = useState(false)

  useEffect(() => {
    const check = () => {
      const consents = getKlaroConsent()
      if (consents.youtube === true) {
        setConsentGiven(true)
        return
      }
      const win = window as WindowWithKlaro
      if (win.klaro?.getManager) {
        try {
          setConsentGiven(Boolean(win.klaro.getManager().getConsent?.('youtube')))
        } catch {
          /* ignore */
        }
      }
      setKlaroReady(Boolean(win.klaro?.show || win.klaro?.getManager))
    }

    check()
    document.addEventListener('klaro', check)
    const interval = window.setInterval(check, 300)
    return () => {
      document.removeEventListener('klaro', check)
      window.clearInterval(interval)
    }
  }, [])

  const youtubeId = videoSource?.match(
    /(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([^?&"'>]+)/,
  )?.[1]

  if (!videoSource || !youtubeId) return null

  const about = artwork.descriptionShort?.trim() || lexicalToPlain(artwork.descriptionLong)

  return (
    <>
      <Link href="/" className="artwork-image__close">
        <CloseCircleSvg />
        <p>close</p>
      </Link>

      <div className="artwork-video__youtube-link">
        <p>visit the channel</p>
        <div className="artwork-video__youtube-svg">
          <YoutubePlainSvg />
        </div>
      </div>

      <div className="artwork-video__container" style={{ width: size.width, marginTop: topMargin }}>
        <div
          className="artwork-video__player-wrapper"
          style={{ width: displayWidth, height: displayHeight, background: '#000', borderRadius: 12 }}
        >
          {consentGiven ? (
            <iframe
              data-name="youtube"
              src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=0&rel=0`}
              title={artwork.title ?? 'Artwork video'}
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
            />
          ) : (
            <div className="artwork-video__consent-block">
              <div className="artwork-video__youtube--play">
                <YoutubePlainSvg />
              </div>
              <p>Enable videos in privacy settings to watch</p>
              <button
                type="button"
                disabled={!klaroReady}
                onClick={() => {
                  const win = window as WindowWithKlaro
                  win.klaro?.show?.() ?? win.klaro?.getManager?.()?.show?.()
                }}
              >
                {klaroReady ? 'Manage Privacy Settings' : 'Loading...'}
              </button>
            </div>
          )}
        </div>

        <div className="artwork-video__info-container">
          <h2 className="artwork-grid__info--title">
            {artwork.title} <span>| {formatArtworkYearRange(artwork)}</span>
          </h2>
          <p className="artwork-video__medium">{resolveWallLabelMedium(artwork)}</p>
          {about ? <div className="artwork-video__info-content"><p>{about}</p></div> : null}
        </div>
      </div>
    </>
  )
}
