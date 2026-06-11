import {
  getPopulatedSocialChannels,
  getSocialChannelUrl,
  type SocialChannelKey,
} from '@/lib/contact/socialChannels'
import type { Artist } from '@/payload-types'

import { SocialChannelIcon } from './socialIcons'

type Props = {
  artist: Artist
}

export default function ContactSocials({ artist }: Props) {
  const populated = getPopulatedSocialChannels(artist)
  if (!populated.length) return null

  const primaryKey = artist.primarySocialChannel as SocialChannelKey | null | undefined
  const primaryUrl = getSocialChannelUrl(artist, primaryKey)
  const primaryChannel = primaryUrl && primaryKey
    ? populated.find((channel) => channel.key === primaryKey)
    : null

  const secondary = populated.filter((channel) => channel.key !== primaryKey)

  return (
    <section className="mx-auto w-full max-w-[34.375rem] border-t border-[var(--ui-line)] pt-[1.875rem]">
      {primaryChannel ? (
        <div className="mb-[1.25rem]">
          <p className="mb-[0.75rem] font-body text-sm leading-[1.6] text-dark m:text-lg">
            Most active here day to day — follow the work as it happens, and DM me directly.
          </p>
          <a
            href={primaryChannel.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-heading text-sm font-semibold text-primary hover:underline"
          >
            <SocialChannelIcon channel={primaryChannel.key} className="h-6 w-6 fill-[var(--ui-icon)]" />
            {primaryChannel.label}
          </a>
        </div>
      ) : null}

      {secondary.length > 0 ? (
        <div>
          <p className="mb-[0.75rem] font-heading text-sm text-secondary">Also here:</p>
          <div className="flex flex-wrap gap-4">
            {secondary.map((channel) => (
              <a
                key={channel.key}
                href={channel.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={channel.label}
                className="opacity-60 transition-opacity duration-200 hover:opacity-100"
              >
                <SocialChannelIcon channel={channel.key} className="h-6 w-6 fill-[var(--ui-icon)]" />
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
