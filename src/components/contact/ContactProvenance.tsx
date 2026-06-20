import LexicalProse from '@/lib/contact/LexicalProse'
import { CONTACT_PROSE_CLASS } from '@/lib/contact/contactProseClass'
import { buildWhatsAppUrl } from '@/lib/contact/whatsapp'
import { WhatsAppCircleSvg } from '@/components/icons'
import type { Artist } from '@/payload-types'

type Props = {
  artist: Artist
}

export default function ContactProvenance({ artist }: Props) {
  const hasProvenance = Boolean(artist.contactProvenanceText)
  const hasThankYou = Boolean(artist.contactThankYouText)
  const whatsapp = artist.whatsappNumber?.trim()

  if (!hasProvenance && !hasThankYou && !whatsapp) return null

  return (
    <section className="pb-[2rem]">
      {hasProvenance ? (
        <>
          <h2 className="font-heading text-[1.625rem] font-extrabold text-[var(--text-strong)]">
            If you own one of these works
          </h2>
          <LexicalProse content={artist.contactProvenanceText} className={CONTACT_PROSE_CLASS} />
        </>
      ) : null}

      {whatsapp ? (
        <a
          href={buildWhatsAppUrl(whatsapp, artist.whatsappPrefilledMessage)}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-[1.25rem] inline-flex items-center gap-2 rounded-[0.1875rem] bg-[#6FA88A] px-[1.125rem] py-[0.625rem] font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <WhatsAppCircleSvg className="h-5 w-5 shrink-0" />
          Message me directly on WhatsApp
        </a>
      ) : null}

      {hasThankYou ? (
        <div className="mt-[2rem] border-t border-[#eee] pt-[1.5rem]">
          <h3 className="font-heading text-base font-bold text-primary">A note of thanks</h3>
          <LexicalProse content={artist.contactThankYouText} className={CONTACT_PROSE_CLASS} />
        </div>
      ) : null}
    </section>
  )
}
