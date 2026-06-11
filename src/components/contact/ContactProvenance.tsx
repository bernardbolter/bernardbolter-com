import LexicalProse from '@/lib/contact/LexicalProse'
import { buildWhatsAppUrl } from '@/lib/contact/whatsapp'
import type { Artist } from '@/payload-types'

import { WhatsAppIcon } from './socialIcons'

const PROSE_CLASS =
  'font-body text-sm leading-[1.6] text-dark m:text-lg [&_p]:indent-[0.75rem] [&_p]:pb-[1.25rem]'

type Props = {
  artist: Artist
}

export default function ContactProvenance({ artist }: Props) {
  const hasProvenance = Boolean(artist.contactProvenanceText)
  const hasThankYou = Boolean(artist.contactThankYouText)
  const whatsapp = artist.whatsappNumber?.trim()

  if (!hasProvenance && !hasThankYou && !whatsapp) return null

  return (
    <section className="mx-auto w-full max-w-[34.375rem]">
      {hasProvenance ? (
        <>
          <h2 className="font-heading text-[1.375rem] font-extrabold text-[var(--text-strong)]">
            If you own one of these works
          </h2>
          <LexicalProse content={artist.contactProvenanceText} className={PROSE_CLASS} />
        </>
      ) : null}

      {whatsapp ? (
        <a
          href={buildWhatsAppUrl(whatsapp, artist.whatsappPrefilledMessage)}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-[1.25rem] inline-flex items-center gap-2 font-heading text-sm font-semibold text-primary hover:underline"
        >
          <WhatsAppIcon className="h-5 w-5 fill-[var(--ui-icon)]" />
          Message me directly on WhatsApp
        </a>
      ) : null}

      {hasThankYou ? (
        <>
          <h3 className="font-heading text-base font-bold text-primary">A note of thanks</h3>
          <LexicalProse content={artist.contactThankYouText} className={PROSE_CLASS} />
        </>
      ) : null}
    </section>
  )
}
