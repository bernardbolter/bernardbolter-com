'use client'

import { useArtworks } from '@/providers/ArtworkProvider'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

import AnimatedHamburgerMenu from './AnimatedHamburgerMenu'
import {
  BackArrowSvg,
  InstaCircleSvg,
  LinkSvg,
  LinkedinCircleSvg,
  TiktokCircleSvg,
  YoutubeCircleSvg,
} from '@/components/icons'

const staticRoutes = ['/', '/bio', '/cv', '/statement', '/contact']

/** Legacy info chrome layout (fixed tops / heights in px). */
const NAME_TOP_PX = 0
const NAME_HEIGHT_PX = 79
const MENU_BUTTON_TOP_PX = 79
const MENU_BUTTON_HEIGHT_PX = 50
const MENU_CONTENT_TOP_PX = 129

const Info = () => {
  const [state, setState] = useArtworks()
  const artist = state.artistData
  const pathname = usePathname()
  const isDynamicRoute = !staticRoutes.includes(pathname)

  const closeInfo = () => setState((prev) => ({ ...prev, infoOpen: false }))

  return (
    <>
      <div
        className="fixed left-0 z-[2000] box-border w-max min-w-[10rem] rounded-br-[0.375rem] bg-surface-nav p-[7px]"
        style={{ top: NAME_TOP_PX, height: NAME_HEIGHT_PX }}
      >
        <h1 className="font-title text-[1.8125rem] leading-none tracking-[0.03em] text-dark">
          {artist?.name ?? 'Loading...'}
        </h1>
        {!isDynamicRoute ? (
          <>
            <h3 className="font-heading text-sm font-light leading-[1.1] text-secondary">
              {`b. ${artist?.birthCity ?? ''}${artist?.birthCity && artist?.birthYear ? ', ' : ''}${artist?.birthYear ?? ''}`}
            </h3>
            <h2 className="font-heading text-sm font-light leading-[1.1] text-secondary">
              {`Lives and works ${artist?.workCity1 ?? ''}${artist?.workCity1 && artist?.workCity2 ? ' and ' : ''}${artist?.workCity2 ?? ''}`}
            </h2>
          </>
        ) : (
          <Link
            href="/"
            className="flex cursor-pointer items-center pt-2 opacity-70 transition-opacity duration-500 hover:opacity-100"
          >
            <div className="h-4 w-4 fill-secondary">
              <BackArrowSvg />
            </div>
            <p className="m-0 px-0 pb-[0.375rem] text-sm font-extrabold text-secondary">All Artwork</p>
          </Link>
        )}
      </div>

      <div
        className="fixed left-0 z-[1999] h-[50px] bg-surface-nav transition-[width,border-radius] duration-300 ease-in-out"
        style={{
          top: MENU_BUTTON_TOP_PX,
          height: MENU_BUTTON_HEIGHT_PX,
          width: state.infoOpen ? 149 : 50,
          borderBottomRightRadius: state.infoOpen ? 0 : 6,
        }}
      >
        <button
          type="button"
          className="relative z-[2001] h-[50px] w-[50px] cursor-pointer"
          aria-expanded={state.infoOpen}
          aria-label={state.infoOpen ? 'Close site menu' : 'Open site menu'}
          onClick={() => setState((prev) => ({ ...prev, infoOpen: !prev.infoOpen }))}
        >
          <AnimatedHamburgerMenu />
        </button>
      </div>

      <div
        className={`fixed left-0 z-[2000] w-[9.3125rem] rounded-br-[0.625rem] bg-surface-nav pb-space-4 pl-space-3 transition-transform duration-500 ${
          state.infoOpen ? 'translate-x-0' : 'pointer-events-none -translate-x-[10.5625rem]'
        }`}
        style={{ top: MENU_CONTENT_TOP_PX }}
      >
        <div className="flex flex-col items-start">
          {(artist?.websiteLinks ?? []).map((link) => (
            <a
              key={link.url}
              href={link.url}
              rel="noopener noreferrer"
              className="flex items-center py-[0.125rem] text-dark no-underline hover:text-ui-highlight"
            >
              <span className="mr-[0.1875rem] inline-flex h-[0.625rem] w-[0.875rem] shrink-0 text-dark opacity-80">
                <LinkSvg />
              </span>
              <h3 className="m-0 pb-1 pl-0 font-heading text-[0.9375rem] font-normal leading-[1.2]">
                {link.label}
              </h3>
            </a>
          ))}
        </div>

        <div className="my-space-4 h-px w-[1.875rem] bg-dark" />

        <div className="flex flex-col items-start">
          {pathname !== '/' && (
            <Link
              href="/"
              onClick={closeInfo}
              className="py-[0.1875rem] font-heading text-[1.1875rem] font-bold text-dark no-underline opacity-90 transition-all duration-200 hover:opacity-100 hover:after:ml-[0.1875rem] hover:after:inline-block hover:after:h-[0.3125rem] hover:after:w-[0.3125rem] hover:after:rounded-full hover:after:bg-ui-highlight hover:after:content-['']"
            >
              Artwork
            </Link>
          )}
          {pathname !== '/bio' && (
            <Link
              href="/bio"
              onClick={closeInfo}
              className="py-[0.1875rem] font-heading text-[1.1875rem] font-bold text-dark no-underline opacity-90 transition-all duration-200 hover:opacity-100 hover:after:ml-[0.1875rem] hover:after:inline-block hover:after:h-[0.3125rem] hover:after:w-[0.3125rem] hover:after:rounded-full hover:after:bg-ui-highlight hover:after:content-['']"
            >
              Bio
            </Link>
          )}
          {pathname !== '/cv' && (
            <Link
              href="/cv"
              onClick={closeInfo}
              className="py-[0.1875rem] font-heading text-[1.1875rem] font-bold text-dark no-underline opacity-90 transition-all duration-200 hover:opacity-100 hover:after:ml-[0.1875rem] hover:after:inline-block hover:after:h-[0.3125rem] hover:after:w-[0.3125rem] hover:after:rounded-full hover:after:bg-ui-highlight hover:after:content-['']"
            >
              CV
            </Link>
          )}
          {pathname !== '/statement' && (
            <Link
              href="/statement"
              onClick={closeInfo}
              className="py-[0.1875rem] font-heading text-[1.1875rem] font-bold text-dark no-underline opacity-90 transition-all duration-200 hover:opacity-100 hover:after:ml-[0.1875rem] hover:after:inline-block hover:after:h-[0.3125rem] hover:after:w-[0.3125rem] hover:after:rounded-full hover:after:bg-ui-highlight hover:after:content-['']"
            >
              Statement
            </Link>
          )}
          {pathname !== '/contact' && (
            <Link
              href="/contact"
              onClick={closeInfo}
              className="py-[0.1875rem] font-heading text-[1.1875rem] font-bold text-dark no-underline opacity-90 transition-all duration-200 hover:opacity-100 hover:after:ml-[0.1875rem] hover:after:inline-block hover:after:h-[0.3125rem] hover:after:w-[0.3125rem] hover:after:rounded-full hover:after:bg-ui-highlight hover:after:content-['']"
            >
              Contact
            </Link>
          )}
        </div>

        <div className="my-space-4 h-px w-[1.875rem] bg-dark" />

        <div className="flex flex-row items-start s:flex-col">
          <a
            className="mr-space-4 h-[1.875rem] w-[1.875rem] scale-100 no-underline transition-transform duration-300 hover:scale-[1.02] s:mb-space-4 s:mr-0"
            href="https://www.instagram.com/bernardbolter"
            rel="noopener noreferrer"
          >
            <InstaCircleSvg />
          </a>
          <a
            className="mr-space-4 h-[1.875rem] w-[1.875rem] scale-100 no-underline transition-transform duration-300 hover:scale-[1.02] s:mb-space-4 s:mr-0"
            href="https://www.tiktok.com/@bernardbreaksdownart"
            rel="noopener noreferrer"
          >
            <TiktokCircleSvg />
          </a>
          <a
            className="mr-space-4 h-[1.875rem] w-[1.875rem] scale-100 no-underline transition-transform duration-300 hover:scale-[1.02] s:mb-space-4 s:mr-0"
            href="https://www.youtube.com/channel/UCL5q08QoZ6yjHwYkGzJpKXg"
            rel="noopener noreferrer"
          >
            <YoutubeCircleSvg />
          </a>
          <a
            className="h-[1.875rem] w-[1.875rem] scale-100 no-underline transition-transform duration-300 hover:scale-[1.02]"
            href="https://www.linkedin.com/in/bernard-bolter-iv/"
            rel="noopener noreferrer"
          >
            <LinkedinCircleSvg />
          </a>
        </div>
      </div>
    </>
  )
}

export default Info
