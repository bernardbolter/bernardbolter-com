import {
  InstaCircleSvg,
  LinkedinCircleSvg,
  TiktokCircleSvg,
  YoutubeCircleSvg,
} from '@/components/icons'
import {
  getPopulatedSocialChannels,
  getSocialChannelUrl,
  type SocialChannelKey,
} from '@/lib/contact/socialChannels'
import type { Artist } from '@/payload-types'

type IconProps = { className?: string }

function FacebookIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M13.5 3H16V0h-2.5C9.91 0 7.5 2.41 7.5 6.5V9H5v3h2.5v12H11V12h3l.5-3h-3.5V6.75C11 4.68 11.68 3 13.5 3z"
      />
    </svg>
  )
}

function VimeoIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M23.9 6.7c-.1 2.4-1.8 5.7-5.1 9.9-3.4 4.4-6.3 6.6-8.7 6.6-1.5 0-2.7-1.4-3.7-4.1-0.7-2.5-1.4-5.1-2.1-7.6-0.8-2.9-1.6-4.4-2.5-4.4-0.2 0-.9.4-2.1 1.2L0 7.5c2.1-1.9 4.2-3.8 6.3-5.7 2.8-2.5 4.9-3.8 6.3-3.9 3.3-0.3 5.3 2 6 6.8z"
      />
    </svg>
  )
}

function SocialChannelIcon({
  channel,
  className,
}: {
  channel: SocialChannelKey
  className?: string
}) {
  switch (channel) {
    case 'instagram':
      return (
        <span className={className ?? 'inline-flex h-6 w-6 shrink-0'}>
          <InstaCircleSvg />
        </span>
      )
    case 'linkedin':
      return (
        <span className={className ?? 'inline-flex h-6 w-6 shrink-0'}>
          <LinkedinCircleSvg />
        </span>
      )
    case 'youtube':
      return (
        <span className={className ?? 'inline-flex h-6 w-6 shrink-0'}>
          <YoutubeCircleSvg />
        </span>
      )
    case 'tiktok':
      return (
        <span className={className ?? 'inline-flex h-6 w-6 shrink-0'}>
          <TiktokCircleSvg />
        </span>
      )
    case 'facebook':
      return <FacebookIcon className={`${className ?? 'h-6 w-6'} fill-[var(--ui-icon)]`} />
    case 'vimeo':
      return <VimeoIcon className={`${className ?? 'h-6 w-6'} fill-[var(--ui-icon)]`} />
    default:
      return null
  }
}

type Props = {
  artist: Artist
}

export default function ContactSocials({ artist }: Props) {
  const populated = getPopulatedSocialChannels(artist)
  if (!populated.length) return null

  const primaryKey = artist.primarySocialChannel as SocialChannelKey | null | undefined
  const primaryUrl = getSocialChannelUrl(artist, primaryKey)
  const primaryChannel =
    primaryUrl && primaryKey ? populated.find((channel) => channel.key === primaryKey) : null

  const secondary = populated.filter((channel) => channel.key !== primaryKey)

  return (
    <section className="border-t border-[var(--ui-line)] pt-[1.875rem]">
      {primaryChannel ? (
        <div className="mb-[1.25rem] max-w-[58ch]">
          <p className="mb-[0.75rem] font-body text-sm leading-[1.7] text-dark l:text-[1.0625rem]">
            Most active here day to day — follow the work as it happens, and DM me directly.
          </p>
          <a
            href={primaryChannel.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-heading text-sm font-semibold text-primary no-underline hover:underline"
          >
            <SocialChannelIcon channel={primaryChannel.key} />
            {primaryChannel.label}
          </a>
        </div>
      ) : null}

      {secondary.length > 0 ? (
        <div>
          <p className="mb-[0.75rem] font-heading text-sm text-secondary">Also here:</p>
          <div className="flex flex-wrap gap-[1rem]">
            {secondary.map((channel) => (
              <a
                key={channel.key}
                href={channel.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={channel.label}
                className="opacity-60 transition-opacity duration-200 hover:opacity-100"
              >
                <SocialChannelIcon channel={channel.key} />
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
