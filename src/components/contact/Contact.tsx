'use client'

import Link from 'next/link'
import { Suspense } from 'react'

import { CloseCircleSvg } from '@/components/icons'
import HeaderTitle from '@/components/info/HeaderTitle'
import LexicalProse from '@/lib/contact/LexicalProse'
import { CONTACT_PROSE_CLASS } from '@/lib/contact/contactProseClass'
import type { Artist } from '@/payload-types'

import ContactForm from './ContactForm'
import ContactImpressum from './ContactImpressum'
import ContactStudios from './ContactStudios'
import ContactZoneA from './ContactZoneA'

import './contact-page.css'

type Props = {
  artist: Artist
}

export default function Contact({ artist }: Props) {
  return (
    <section className="mx-auto flex min-h-screen w-full max-w-[68.75rem] flex-col overflow-y-scroll bg-[var(--surface-page)] px-[2rem] pb-[1.875rem] pt-[9.375rem] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <HeaderTitle title="contact" large />

      <Link
        href="/"
        className="contact__close-container fixed right-0 top-[3.125rem] z-[5001] flex w-[2.1875rem] flex-col items-center justify-center opacity-60 no-underline transition-opacity hover:opacity-90 s:top-[3.625rem] s:w-[2.625rem] m:top-[5.5625rem] l:top-[6.25rem]"
      >
        <span className="w-full fill-dark">
          <CloseCircleSvg />
        </span>
        <p className="m-0 font-heading text-[0.625rem] font-light tracking-[0.05em] text-dark">
          close
        </p>
      </Link>

      <div className="contact-page__stack">
        <ContactZoneA artist={artist} />

        <div className="contact-zone-studios">
          <ContactStudios artist={artist} />
        </div>

        <div className="contact-zone-b pt-[2.5rem]">
          <Suspense fallback={null}>
            <ContactForm enquiryIntro={artist.contactEnquiryIntro} />
          </Suspense>

          {artist.contactCorrectionsText ? (
            <section className="pt-[1.875rem]">
              <h3 className="font-heading text-base font-bold text-primary">Helping build the record</h3>
              <LexicalProse content={artist.contactCorrectionsText} className={CONTACT_PROSE_CLASS} />
            </section>
          ) : null}

          <p className="py-[1.875rem] text-center font-body text-sm text-muted">
            I read everything. I reply when I can.
          </p>

          <ContactImpressum artist={artist} />
        </div>
      </div>
    </section>
  )
}
