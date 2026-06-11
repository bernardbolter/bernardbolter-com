import Link from 'next/link'

import { LinkSvg } from '@/components/icons'
import LexicalProse from '@/lib/contact/LexicalProse'
import type { Artist } from '@/payload-types'

type Props = {
  artist: Artist
}

export default function ContactImpressum({ artist }: Props) {
  const impressum = artist.impressum
  if (!impressum?.legalName?.trim()) return null

  const year = new Date().getFullYear()

  return (
    <div className="mx-auto flex w-full max-w-[50rem] flex-col pb-[1.875rem] pt-[1.875rem]">
      <Link
        href="/datenschutz"
        className="inline-flex items-center text-[1.25rem] no-underline hover:underline"
      >
        <span className="mr-[0.3125rem] inline-flex h-[0.9375rem] w-[0.9375rem] fill-[var(--ui-icon)]">
          <LinkSvg />
        </span>
        Datenschutz
      </Link>

      <h2 className="pt-[0.9375rem] font-heading text-lg font-light tracking-[0.05em] text-primary">
        Impressum
      </h2>
      <div className="my-[0.625rem] h-px w-full bg-[var(--ui-line)]" />

      <p className="py-[0.1875rem] font-heading text-base font-medium text-primary">
        {impressum.legalName}
      </p>
      {impressum.streetAddress ? (
        <p className="py-[0.1875rem] font-heading text-base font-medium text-primary">
          {impressum.streetAddress}
        </p>
      ) : null}
      <p className="py-[0.1875rem] font-heading text-base font-medium text-primary">
        {[impressum.postalCode, impressum.city, impressum.country].filter(Boolean).join(' ')}
      </p>
      {impressum.publicEmail ? (
        <p className="py-[0.1875rem] font-heading text-base font-medium text-primary">
          {impressum.publicEmail}
        </p>
      ) : null}

      {impressum.kleinunternehmerText ? (
        <>
          <div className="my-[0.625rem] h-px w-full bg-[var(--ui-line)]" />
          <p className="pb-[0.3125rem] font-body text-sm font-light leading-[1.4] text-secondary">
            {impressum.kleinunternehmerText}
          </p>
        </>
      ) : null}

      {impressum.odrText ? (
        <LexicalProse
          content={impressum.odrText}
          className="font-body text-sm font-light leading-[1.4] text-secondary [&_a]:font-semibold [&_a]:text-primary [&_p]:pb-[0.3125rem]"
        />
      ) : null}

      <div className="my-[0.625rem] h-px w-full bg-[var(--ui-line)]" />
      <p className="font-heading text-[0.8125rem] text-primary">
        &copy; all rights reserved 1974 – {year}
      </p>
    </div>
  )
}
