'use client'

import { Link, useAuth, useConfig } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'
import { formatAdminURL } from 'payload/shared'
import { Fragment } from 'react'

import { isArtistOrAdmin } from '@/access/isArtistOrAdmin'

const baseClass = 'nav'

export function ArtOfficialNavLink() {
  const { user } = useAuth()
  const pathname = usePathname()
  const {
    config: {
      routes: { admin: adminRoute },
    },
  } = useConfig()

  if (!isArtistOrAdmin(user)) return null

  const href = formatAdminURL({ adminRoute, path: '/art-official' })
  const isActive = pathname === href || pathname.startsWith(`${href}/`)

  const label = (
    <Fragment>
      {isActive ? <div className={`${baseClass}__link-indicator`} /> : null}
      <span className={`${baseClass}__link-label`}>Art/Official</span>
    </Fragment>
  )

  if (isActive) {
    return (
      <div className={`${baseClass}__link`} id="nav-art-official">
        {label}
      </div>
    )
  }

  return (
    <Link className={`${baseClass}__link`} href={href} id="nav-art-official" prefetch={false}>
      {label}
    </Link>
  )
}
