'use client'

import { useAuth } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'
import { Fragment } from 'react'

import { isArtistOrAdmin } from '@/access/isArtistOrAdmin'

const baseClass = 'nav'
const STUDIO_HREF = '/studio'

export function StudioNavLink() {
  const { user } = useAuth()
  const pathname = usePathname()

  if (!isArtistOrAdmin(user)) return null

  const isActive = pathname === STUDIO_HREF || pathname.startsWith(`${STUDIO_HREF}/`)

  const label = (
    <Fragment>
      {isActive ? <div className={`${baseClass}__link-indicator`} /> : null}
      <span className={`${baseClass}__link-label`}>Studio</span>
    </Fragment>
  )

  if (isActive) {
    return (
      <div className={`${baseClass}__link`} id="nav-studio">
        {label}
      </div>
    )
  }

  return (
    <a className={`${baseClass}__link`} href={STUDIO_HREF} id="nav-studio">
      {label}
    </a>
  )
}
