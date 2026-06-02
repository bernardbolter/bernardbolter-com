'use client'

import type React from 'react'

import useWindowSize from '@/hooks/useWindowSize'
import { useArtworks } from '@/providers/ArtworkProvider'

function getCssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

export function PlaySvg({ showSlideshow }: { showSlideshow?: boolean }) {
  return (
    <svg viewBox="0 0 52 50" aria-hidden="true">
      <path d="M43.8242 44.5L50.0742 49.5H8.6582L1.5752 44.5H43.8242ZM51 11.6484V48.959L44.5 43.7588V1.68164L51 11.6484Z" fill="var(--text-dark)" />
      <path d="M0 6L6 0H44V44H0V6Z" fill="var(--ui-face)" />
      <path
        d="M13.2064 35.9397C13.3303 36.0201 13.4748 36.0201 13.5987 35.9397L35.7935 22.98C35.9381 22.8996 36 22.7991 36 22.6384C36 22.4977 35.9174 22.3772 35.7935 22.3169L13.5987 10.0603C13.5987 10.0603 13.4749 10 13.3923 10C13.3303 10 13.2684 10.0201 13.2065 10.0603C13.0619 10.1407 13 10.2411 13 10.4019V35.5987C13 35.7594 13.0619 35.8593 13.2064 35.9397Z"
        fill="var(--text-dark)"
        style={{ opacity: showSlideshow ? 0 : 1 }}
      />
      <rect x="13" y="12" width="21" height="21" fill="var(--text-dark)" style={{ opacity: showSlideshow ? 1 : 0 }} />
    </svg>
  )
}

export function PauseSvg() {
  const [state] = useArtworks()
  return <ArtworkPauseSvg artworkPlaying={Boolean(state.slideshowPlaying)} setArtworkPlaying={() => {}} />
}

export function SearchSvg({ searchNavOpen = false }: { searchNavOpen?: boolean }) {
  return (
    <svg viewBox="0 0 52 50" aria-hidden="true">
      <path d="M51 11.6484V49.5H8.6582L1.5752 44.5H44.5V1.68164L51 11.6484Z" fill="var(--text-dark)" />
      <path d="M0 6L6 0H44V44H0V6Z" fill="var(--ui-face)" />
      <path
        d="M20.1645 8.00003C18.0863 8.00091 16.0378 8.46198 14.1865 9.34554C12.3353 10.2291 10.7337 11.5101 9.51271 13.0838C8.29176 14.6574 7.48609 16.4792 7.16157 18.4C6.83705 20.3209 7.00289 22.2863 7.64552 24.1357C8.28816 25.9851 9.38936 27.6659 10.8591 29.0408C12.3288 30.4157 14.1254 31.4456 16.1019 32.0463C18.0785 32.647 20.1789 32.8016 22.2315 32.4972C24.284 32.1929 26.2305 31.4384 27.9118 30.2953L34.4712 36.4334C34.8589 36.7962 35.3847 37 35.9329 37C36.4811 37 37.0069 36.7962 37.3946 36.4334C37.7822 36.0707 38 35.5787 38 35.0657C38 34.5526 37.7822 34.0606 37.3946 33.6979L30.8352 27.5598C32.2649 25.7209 33.1225 23.5474 33.313 21.2803C33.5035 19.0132 33.0195 16.741 31.9145 14.7155C30.8095 12.6901 29.1268 10.9905 27.0529 9.80518C24.9789 8.61984 22.5947 7.99504 20.1645 8.00003Z"
        fill="var(--text-dark)"
        style={{ opacity: searchNavOpen ? 0 : 1 }}
      />
      <path d="M5 31.3108L5 14.3133L24.6175 14.3133L24.6175 6L42.6969 22.8102L24.6175 39.6241L24.6175 31.3108L5 31.3108Z" fill="var(--text-dark)" style={{ opacity: searchNavOpen ? 1 : 0 }} />
    </svg>
  )
}

export function FilterSvg({ filterNavOpen = false }: { filterNavOpen?: boolean }) {
  const [state] = useArtworks()
  const face = state.filtersArray.length > 0 ? 'var(--surface-nav-light)' : 'var(--ui-face)'
  return (
    <svg viewBox="0 0 52 50" aria-hidden="true">
      <path d="M43.8242 44.5L50.0742 49.5H8.6582L1.5752 44.5H43.8242ZM51 11.6484V48.959L44.5 43.7588V1.68164L51 11.6484Z" fill="var(--text-dark)" />
      <path d="M0 6L6 0H44V44H0V6Z" fill={face} />
      <path d="M30.2402 31.8485H16.7415C16.6522 31.8491 16.5629 31.8567 16.4746 31.8712C16.0475 30.755 15.266 29.8305 14.264 29.2561C13.2621 28.6816 12.102 28.4931 10.9828 28.7228C9.86355 28.9524 8.85485 29.586 8.1296 30.5148C7.40435 31.4437 7.00773 32.61 7.00773 33.8137C7.00773 35.0175 7.40435 36.1838 8.1296 37.1126C8.85485 38.0415 9.86355 38.6751 10.9828 38.9047C12.102 39.1344 13.2621 38.9458 14.264 38.3714C15.266 37.797 16.0475 36.8725 16.4746 35.7563C16.5629 35.7708 16.6522 35.7784 16.7415 35.779H30.2402C30.7337 35.779 31.2069 35.572 31.5559 35.2036C31.9048 34.8352 32.1009 34.3355 32.1009 33.8145C32.1009 33.2935 31.9048 32.7938 31.5559 32.4254C31.2069 32.057 30.7337 31.85 30.2402 31.85V31.8485Z" fill="var(--text-dark)" style={{ opacity: filterNavOpen ? 0 : 1 }} />
      <path d="M5 31.3108L5 14.3133L24.6175 14.3133L24.6175 6L42.6969 22.8102L24.6175 39.6241L24.6175 31.3108L5 31.3108Z" fill="var(--text-dark)" style={{ opacity: filterNavOpen ? 1 : 0 }} />
    </svg>
  )
}

export function SortSvg() {
  return (
    <svg viewBox="0 0 24 30" aria-hidden="true">
      <path d="M10.939,8.061a1.5,1.5,0,0,0,2.122-2.122l-4-4a1.5,1.5,0,0,0-2.122,0l-4,4A1.5,1.5,0,0,0,5.061,8.061L6.5,6.621V21a1.5,1.5,0,0,0,3,0V6.621Z" />
      <path d="M21.061,15.939a1.5,1.5,0,0,0-2.122,0L17.5,17.379V3a1.5,1.5,0,0,0-3,0V17.379l-1.439-1.44a1.5,1.5,0,0,0-2.122,2.122l4,4a1.5,1.5,0,0,0,2.122,0l4-4A1.5,1.5,0,0,0,21.061,15.939Z" />
    </svg>
  )
}

export function LeftArrowSvg({ isRight = false }: { isRight?: boolean }) {
  return (
    <svg viewBox="0 0 52 50" aria-hidden="true">
      <path d="M50.999 11.6484V49.5H8.65723L1.57422 44.5H44.499V1.68164L50.999 11.6484Z" fill="var(--text-dark)" />
      <path d="M-0.000976562 6L5.99902 0H43.999V44H-0.000976562V6Z" fill="var(--ui-face)" />
      <path d="M40.6963 31.3108L40.6963 14.3133L21.0788 14.3133L21.0788 6L2.9994 22.8102L21.0788 39.6241L21.0788 31.3108L40.6963 31.3108Z" fill="var(--text-dark)" className={isRight ? 'artwork-image__button--arrow' : undefined} />
    </svg>
  )
}

export function RightArrowSvg() {
  return (
    <svg viewBox="0 0 52 50" aria-hidden="true">
      <path d="M0.5 11.6484V49.5H42.8418L49.9248 44.5H7V1.68164L0.5 11.6484Z" fill="var(--text-dark)" />
      <path d="M51.5 6L45.5 0H7.5V44H51.5V6Z" fill="var(--ui-face)" />
      <path d="M11 31.3108L11 14.3133L30.6175 14.3133L30.6175 6L48.6969 22.8102L30.6175 39.6241L30.6175 31.3108L11 31.3108Z" fill="var(--text-dark)" />
    </svg>
  )
}

export function BackArrowSvg() {
  return (
    <svg viewBox="38 40 22 20" aria-hidden="true">
      <polygon points="49.9,42.8 48.5,41.4 39.9,50 48.5,58.6 49.9,57.2 43.7,51 58.7,51 58.7,49 43.7,49" />
    </svg>
  )
}

export function CloseCircleSvg() {
  return (
    <svg viewBox="16 16 68 68" aria-hidden="true">
      <path d="M 50 18 C 32.350578 18 18 32.350577 18 50 C 18 67.649423 32.350578 82 50 82 C 67.649423 82 82 67.649423 82 50 C 82 32.350577 67.649423 18 50 18 z M 50 22 C 65.487663 22 78 34.512337 78 50 C 78 65.487663 65.487663 78 50 78 C 34.512338 78 22 65.487663 22 50 C 22 34.512337 34.512338 22 50 22 z M 38.78125 36.96875 A 2.0001999 2.0001999 0 0 0 37.59375 40.40625 L 47.1875 50 L 37.59375 59.59375 A 2.0001999 2.0001999 0 1 0 40.40625 62.40625 L 50 52.8125 L 59.59375 62.40625 A 2.0001999 2.0001999 0 1 0 62.40625 59.59375 L 52.8125 50 L 62.40625 40.40625 A 2.0001999 2.0001999 0 0 0 60.96875 36.96875 A 2.0001999 2.0001999 0 0 0 59.59375 37.59375 L 50 47.1875 L 40.40625 37.59375 A 2.0001999 2.0001999 0 0 0 38.96875 36.96875 A 2.0001999 2.0001999 0 0 0 38.78125 36.96875 z" />
    </svg>
  )
}

export function LinkSvg() {
  return (
    <svg viewBox="0 0 44 39" aria-hidden="true">
      <path d="M16.9415 28.5085C18.5705 29.5439 20.4205 30.2418 22.3657 30.5549L16.8784 35.648C15.0243 37.3691 12.5096 38.336 9.88742 38.3361C7.26524 38.3362 4.7504 37.3695 2.89615 35.6486C1.0419 33.9277 0.00012473 31.5936 0 29.1598C-0.000124708 26.726 1.04141 24.3918 2.89549 22.6708L12.2157 14.0189C14.0717 12.3008 16.586 11.336 19.2072 11.336C21.8285 11.336 24.3427 12.3008 26.1987 14.0189C26.3978 14.2082 26.5629 14.4259 26.6876 14.6638C26.7062 14.6981 26.7279 14.7296 26.7447 14.7643C26.8525 14.9888 26.9237 15.227 26.9562 15.471C26.9613 15.5084 26.9642 15.5443 26.9676 15.5818C26.9921 15.8334 26.9754 16.087 26.9181 16.334C26.9152 16.3461 26.91 16.3571 26.9069 16.3689C26.7983 16.8029 26.5664 17.202 26.2352 17.5245C25.9041 17.847 25.4858 18.0812 25.024 18.2028C24.5622 18.3243 24.0737 18.3288 23.6095 18.2156C23.1452 18.1024 22.7221 17.8758 22.3842 17.5594C21.8652 17.0792 21.2276 16.724 20.5269 16.5248C19.8262 16.3256 19.0837 16.2884 18.364 16.4164L18.3635 16.4165C17.48 16.5721 16.6672 16.9702 16.0302 17.5594L11.8128 21.4751L11.8088 21.4781L6.7101 26.2112C5.8693 26.9939 5.39715 28.0541 5.39715 29.1594C5.39715 30.2647 5.8693 31.3248 6.7101 32.1075C7.56617 32.8656 8.70389 33.2885 9.88705 33.2885C11.0702 33.2885 12.2079 32.8656 13.064 32.1075L16.9415 28.5085Z" />
    </svg>
  )
}

export function MenuSvg() {
  return (
    <svg viewBox="-5 -10 110 135" aria-hidden="true">
      <path d="m83.113 22.918h-66.227c-1.293 0-2.3438-1.0508-2.3438-2.3438s1.0508-2.3438 2.3438-2.3438h66.223c1.293 0 2.3438 1.0508 2.3438 2.3438 0.003906 1.293-1.0469 2.3438-2.3398 2.3438z" />
      <path d="m70.613 52.344h-53.727c-1.293 0-2.3438-1.0508-2.3438-2.3438s1.0508-2.3438 2.3438-2.3438h53.723c1.293 0 2.3438 1.0508 2.3438 2.3438 0.003906 1.293-1.0469 2.3438-2.3398 2.3438z" />
      <path d="m58.113 81.77h-41.227c-1.293 0-2.3438-1.0508-2.3438-2.3438s1.0508-2.3438 2.3438-2.3438h41.223c1.293 0 2.3438 1.0508 2.3438 2.3438 0.003906 1.293-1.0469 2.3438-2.3398 2.3438z" />
    </svg>
  )
}

export function PlayButtonSvg() {
  return (
    <svg viewBox="0 0 52 50" aria-hidden="true">
      <path d="M13.2064 35.9397C13.3303 36.0201 13.4748 36.0201 13.5987 35.9397L35.7935 22.98C35.9381 22.8996 36 22.7991 36 22.6384C36 22.4977 35.9174 22.3772 35.7935 22.3169L13.5987 10.0603C13.5987 10.0603 13.4749 10 13.3923 10C13.3303 10 13.2684 10.0201 13.2065 10.0603C13.0619 10.1407 13 10.2411 13 10.4019V35.5987C13 35.7594 13.0619 35.8593 13.2064 35.9397Z" fill="currentColor" />
    </svg>
  )
}

export function TimerSvg() {
  const [state] = useArtworks()
  const progress = state.slideshowTimerProgress ?? 0
  return <ArtworkTimerSvg progress={progress} />
}

export function ArtworkTimerSvg({ progress }: { progress: number }) {
  const circumference = Math.PI * 2 * 13
  const strokeDashoffset = circumference - (progress / 100) * circumference
  return (
    <svg viewBox="-2 -2 40 40" aria-hidden="true">
      <circle cx={13} cy={13} r={13} fill="none" strokeWidth={2} stroke="var(--ui-icon-light)" />
      <circle cx={13} cy={13} r={13} fill="none" strokeWidth={2} strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" stroke="var(--ui-icon)" />
    </svg>
  )
}

export function ArtworkPauseSvg({
  artworkPlaying,
  setArtworkPlaying,
}: {
  artworkPlaying: boolean
  setArtworkPlaying: (playing: boolean) => void
}) {
  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    e.stopPropagation()
    setArtworkPlaying(!artworkPlaying)
  }
  return (
    <svg viewBox="0 0 52 50" onClick={handleClick} aria-hidden="true">
      <path d="M43.8242 44.5L50.0742 49.5H8.6582L1.5752 44.5H43.8242ZM51 11.6484V48.959L44.5 43.7588V1.68164L51 11.6484Z" fill="var(--text-dark)" />
      <path d="M0 6L6 0H44V44H0V6Z" fill="var(--ui-face)" />
      <path d="M13.2064 35.9397C13.3303 36.0201 13.4748 36.0201 13.5987 35.9397L35.7935 22.98C35.9381 22.8996 36 22.7991 36 22.6384C36 22.4977 35.9174 22.3772 35.7935 22.3169L13.5987 10.0603C13.5987 10.0603 13.4749 10 13.3923 10C13.3303 10 13.2684 10.0201 13.2065 10.0603C13.0619 10.1407 13 10.2411 13 10.4019V35.5987C13 35.7594 13.0619 35.8593 13.2064 35.9397Z" fill="var(--text-dark)" style={{ opacity: artworkPlaying ? 0 : 1 }} />
      <rect x="11" y="10" width="10" height="26" fill="var(--text-dark)" style={{ opacity: artworkPlaying ? 1 : 0 }} />
      <rect x="25" y="10" width="10" height="26" fill="var(--text-dark)" style={{ opacity: artworkPlaying ? 1 : 0 }} />
    </svg>
  )
}

function useTitleViewState(): 'desktop' | 'mobile' | 'slideshow' {
  const [state] = useArtworks()
  const size = useWindowSize()
  if (state.showSlideshow) return 'slideshow'
  if (size.width && size.width < 768) return 'mobile'
  return 'desktop'
}

export function TitleCornerTopLeft() {
  const viewState = useTitleViewState()
  const titleDark = getCssVar('--title-dark', '#999')
  return (
    <svg width="10" height="10" aria-hidden="true">
      {viewState === 'desktop' && <polygon points="0,10 10,0 10,10" />}
      {viewState === 'mobile' && <polygon points="10,0 0,10, 10,10" />}
      {viewState === 'slideshow' && <polygon points="10,0, 0,10, 10,10" />}
      {viewState === 'desktop' && <line x1="0" y1="10" x2="10" y2="10" stroke={titleDark} strokeWidth="2" />}
      {viewState === 'desktop' && <line x1="0" y1="10" x2="10" y2="0" stroke={titleDark} strokeWidth="1" />}
      {viewState === 'slideshow' && <line x1="10" y1="0" x2="10" y2="10" stroke={titleDark} strokeWidth="2" />}
    </svg>
  )
}

export function TitleCornerTopRight() {
  const viewState = useTitleViewState()
  const titleDark = getCssVar('--title-dark', '#999')
  const titleShadow = getCssVar('--title-shadow', '#ddd')
  const titleText = getCssVar('--title-text', '#666')
  return (
    <svg width="10" height="10" aria-hidden="true">
      {viewState === 'desktop' && <polygon points="0,0 10,0 10,10 0,10" />}
      {viewState === 'desktop' && <polygon points="10,0 10,10 0,10" fill={titleShadow} />}
      {viewState === 'mobile' && <polygon points="0,0 10,10, 0,10" fill={titleShadow} />}
      {viewState === 'slideshow' && <polygon points="0,0 10,10 0,10" fill={titleText} />}
      {viewState === 'desktop' && <line x1="0" y1="10" x2="10" y2="0" stroke={titleDark} strokeWidth="1" />}
      {viewState === 'desktop' && <line x1="0" y1="0" x2="10" y2="0" stroke={titleDark} strokeWidth="2" />}
    </svg>
  )
}

export function TitleCornerBottomLeft() {
  const viewState = useTitleViewState()
  const titleDark = getCssVar('--title-dark', '#999')
  return (
    <svg width="10" height="10" aria-hidden="true">
      {viewState === 'desktop' && <polygon points="0,0 10,10 10,0" />}
      {viewState === 'mobile' && <polygon points="0,0 10,0, 10,10" />}
      {viewState === 'slideshow' && <polygon points="0,0 10,0 10,10 0,10" />}
      {viewState === 'mobile' && <line x1="0" y1="0" x2="10" y2="0" stroke={titleDark} strokeWidth="2" />}
      {viewState === 'mobile' && <line x1="0" y1="0" x2="10" y2="10" stroke={titleDark} strokeWidth="1" />}
    </svg>
  )
}

export function TitleCornerBottomRight() {
  const viewState = useTitleViewState()
  const titleDark = getCssVar('--title-dark', '#999')
  const titleShadow = getCssVar('--title-shadow', '#ddd')
  return (
    <svg width="10" height="10" aria-hidden="true">
      {viewState === 'desktop' && <polygon points="0,10 0,0 10,0" fill={titleShadow} />}
      {viewState === 'mobile' && <polygon points="0,0 10,0, 10,10 0,10" />}
      {viewState === 'mobile' && <polygon points="0,0 10,0, 10,10" fill={titleShadow} />}
      {viewState === 'slideshow' && <polygon points="0,0 10,0 0,10" />}
      {viewState === 'desktop' && <line x1="0" y1="0" x2="0" y2="10" stroke={titleDark} strokeWidth="1" />}
      {viewState === 'desktop' && <line x1="0" y1="10" x2="10" y2="0" stroke={titleDark} strokeWidth="1" />}
    </svg>
  )
}
