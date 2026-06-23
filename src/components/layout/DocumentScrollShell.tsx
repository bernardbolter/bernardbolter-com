'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

import { CloseCircleSvg } from '@/components/icons'
import HeaderTitle from '@/components/info/HeaderTitle'

/**
 * Overlay pages (CV, event detail, bio) use an inner scroll container.
 * Fixed chrome must sit outside that container so it does not repeat while scrolling.
 */
export function DocumentScrollShell({
  title,
  titleLarge = false,
  closeHref,
  scrollClassName,
  contentClassName,
  closeClassName,
  children,
  closeSlot,
  showClose = true,
}: {
  title: string
  titleLarge?: boolean
  closeHref: string
  scrollClassName: string
  contentClassName?: string
  closeClassName: string
  children: ReactNode
  closeSlot?: ReactNode
  showClose?: boolean
}) {
  return (
    <>
      <HeaderTitle title={title} large={titleLarge} />
      {showClose ?
        closeSlot ?? (
          <Link href={closeHref} className={closeClassName}>
            <CloseCircleSvg />
            <p>close</p>
          </Link>
        )
      : null}
      <div className={scrollClassName}>
        {contentClassName ?
          <div className={contentClassName}>{children}</div>
        : children}
      </div>
    </>
  )
}
