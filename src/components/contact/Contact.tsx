'use client'

import Link from 'next/link'

import { CloseCircleSvg } from '@/components/icons'
import HeaderTitle from '@/components/info/HeaderTitle'
import LexicalProse from '@/lib/contact/LexicalProse'
import type { Artist } from '@/payload-types'

import ContactForm from './ContactForm'
import ContactImpressum from './ContactImpressum'
import ContactProvenance from './ContactProvenance'
import ContactSocials from './ContactSocials'
import ContactStatus from './ContactStatus'

import './contact-page.css'

const PROSE_CLASS =
  'font-body text-sm leading-[1.6] text-dark m:text-lg [&_p]:indent-[0.75rem] [&_p]:pb-[1.25rem]'

type Props = {
  artist: Artist
}

export default function Contact({ artist }: Props) {
  return (
    <section className="flex min-h-screen w-full flex-col overflow-y-scroll bg-[var(--surface-page)] px-[10%] pb-[1.875rem] pt-[9.375rem] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <HeaderTitle title="contact" large />

      <Link href="/" className="contact__close-container fixed right-0 top-[3.125rem] z-[5001] flex w-[2.1875rem] flex-col items-center justify-center opacity-60 no-underline transition-opacity hover:opacity-90 s:top-[3.625rem] s:w-[2.625rem] m:top-[5.5625rem] l:top-[6.25rem]">
        <span className="w-full fill-dark">
          <CloseCircleSvg />
        </span>
        <p className="m-0 font-heading text-[0.625rem] font-light tracking-[0.05em] text-dark">
          close
        </p>
      </Link>

      <ContactStatus artist={artist} />
      <ContactProvenance artist={artist} />
      <ContactSocials artist={artist} />
      <ContactForm enquiryIntro={artist.contactEnquiryIntro} />

      {artist.contactCorrectionsText ? (
        <section className="mx-auto w-full max-w-[34.375rem] pt-[1.875rem]">
          <h3 className="font-heading text-base font-bold text-primary">Helping build the record</h3>
          <LexicalProse content={artist.contactCorrectionsText} className={PROSE_CLASS} />
        </section>
      ) : null}

      <p className="py-[1.875rem] text-center font-body text-sm text-muted">
        I read everything. I reply when I can.
      </p>

      <ContactImpressum artist={artist} />
    </section>
  )
}
