'use client'

import { Link, useAuth, useConfig } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'
import { formatAdminURL } from 'payload/shared'
import { Fragment } from 'react'

import { isArtistOrAdmin } from '@/access/isArtistOrAdmin'

const baseClass = 'nav'

export function UpdateAvailabilityNavLink() {
  const { user } = useAuth()
  const pathname = usePathname()
  const {
    config: {
      routes: { admin: adminRoute },
    },
  } = useConfig()

  if (!isArtistOrAdmin(user)) return null

  const href = formatAdminURL({ adminRoute, path: '/collections/artists' })
  const isActive = pathname === href || pathname.startsWith(`${href}/`)

  const label = (
    <Fragment>
      {isActive ? <div className={`${baseClass}__link-indicator`} /> : null}
      <span className={`${baseClass}__link-label`}>Update availability</span>
    </Fragment>
  )

  if (isActive) {
    return (
      <div className={`${baseClass}__link`} id="nav-update-availability">
        {label}
      </div>
    )
  }

  return (
    <Link className={`${baseClass}__link`} href={href} id="nav-update-availability">
      {label}
    </Link>
  )
}
