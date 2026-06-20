'use client'

import type { ComponentType, ReactNode } from 'react'

import { useArtworks } from '@/providers/ArtworkProvider'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

import { useMenuPlusColor } from '@/hooks/useMenuPlusColor'
import { useArtworkPageNavBackLink } from '@/providers/ArtworkPageChromeContext'

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

type SocialIconComponent = ComponentType<{ muted?: boolean }>

function SocialIconLink({ href, Icon }: { href: string; Icon: SocialIconComponent }) {
  return (
    <a
      className="group relative mb-space-4 block h-[1.875rem] w-[1.875rem] scale-100 no-underline transition-transform duration-300 last:mb-0 hover:scale-[1.02]"
      href={href}
      rel="noopener noreferrer"
    >
      <span className="absolute inset-0 opacity-100 transition-opacity duration-300 group-hover:opacity-0">
        <Icon muted />
        
      </span>
      <span className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <Icon />
      </span>
    </a>
  )
}

function NavMenuLink({
  href,
  plusColor,
  onClick,
  children,
}: {
  href: string
  plusColor: string
  onClick?: () => void
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="group py-[0.1875rem] font-heading text-[1.15rem] font-medium text-dark no-underline"
      style={{ ['--menu-plus-color' as string]: plusColor }}
    >
      <span className="relative inline-block">
        <span className="relative inline-block after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-[var(--menu-plus-color)] after:transition-[transform,background-color] after:duration-300 after:ease-out after:content-[''] group-hover:after:scale-x-100">
          {children}
        </span>
        <span
          aria-hidden
          className="absolute bottom-0 left-full ml-[0.1875rem] h-[0.3125rem] w-[0.3125rem] rounded-full bg-[var(--menu-plus-color)] opacity-0 transition-[opacity,background-color] duration-300 group-hover:opacity-100"
        />
      </span>
    </Link>
  )
}

const Info = () => {
  const [state, setState] = useArtworks()
  const plusColor = useMenuPlusColor()
  const artist = state.artistData
  const social = artist?.socialLinks
  const hasSocialLinks = Boolean(
    social?.instagram || social?.tiktok || social?.youtube || social?.linkedin,
  )
  const pathname = usePathname()
  const navBackLink = useArtworkPageNavBackLink()
  const isDynamicRoute = !staticRoutes.includes(pathname)
  const backLinkHref = navBackLink?.href ?? '/'
  const backLinkLabel = navBackLink?.label ?? 'All Artwork'

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
            href={backLinkHref}
            className="flex cursor-pointer items-center pt-2 opacity-70 transition-opacity duration-500 hover:opacity-100"
          >
            <div className="h-4 w-4 fill-secondary">
              <BackArrowSvg />
            </div>
            <p className="m-0 px-0 pb-[0.375rem] text-sm font-extrabold text-secondary">{backLinkLabel}</p>
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
              className="group flex items-center py-[0.125rem] text-dark no-underline"
            >
              <span
                className="mr-[0.1875rem] inline-flex h-[0.625rem] w-[0.875rem] shrink-0 text-dark transition-colors duration-300 group-hover:text-[var(--menu-plus-color)]"
                style={{ ['--menu-plus-color' as string]: plusColor }}
              >
                <LinkSvg />
              </span>
              <h3 className="m-0 pb-1 pl-0 font-heading text-[0.9375rem] font-normal leading-[1.2]">
                <span className="relative inline-block after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-dark after:transition-transform after:duration-300 after:ease-out after:content-[''] group-hover:after:scale-x-100">
                  {link.label}
                </span>
              </h3>
            </a>
          ))}
        </div>

        <div className="my-space-4 h-px w-[1.875rem] bg-dark" />

        <div className="flex flex-col items-start">
          {pathname !== '/' && (
            <NavMenuLink href="/" plusColor={plusColor} onClick={closeInfo}>
              Artwork
            </NavMenuLink>
          )}
          {pathname !== '/bio' && (
            <NavMenuLink href="/bio" plusColor={plusColor} onClick={closeInfo}>
              Bio
            </NavMenuLink>
          )}
          {pathname !== '/cv' && (
            <NavMenuLink href="/cv" plusColor={plusColor} onClick={closeInfo}>
              CV
            </NavMenuLink>
          )}
          {pathname !== '/statement' && (
            <NavMenuLink href="/statement" plusColor={plusColor} onClick={closeInfo}>
              Statement
            </NavMenuLink>
          )}
          {pathname !== '/contact' && (
            <NavMenuLink href="/contact" plusColor={plusColor} onClick={closeInfo}>
              Contact
            </NavMenuLink>
          )}
        </div>

        {hasSocialLinks ? (
          <>
            <div className="my-space-4 h-px w-[1.875rem] bg-dark" />

            <div className="flex flex-col items-start">
              {social?.instagram ? (
                <SocialIconLink href={social.instagram} Icon={InstaCircleSvg} />
              ) : null}
              {social?.tiktok ? (
                <SocialIconLink href={social.tiktok} Icon={TiktokCircleSvg} />
              ) : null}
              {social?.youtube ? (
                <SocialIconLink href={social.youtube} Icon={YoutubeCircleSvg} />
              ) : null}
              {social?.linkedin ? (
                <SocialIconLink href={social.linkedin} Icon={LinkedinCircleSvg} />
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </>
  )
}

export default Info
