import type { SocialChannelKey } from '@/lib/contact/socialChannels'

type IconProps = { className?: string }

export function WhatsAppIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
      />
    </svg>
  )
}

function InstagramIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5zm10 2H7a3 3 0 00-3 3v10a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3zm-5 4.5A5.5 5.5 0 1111.5 19 5.5 5.5 0 0112 8.5zm0 2A3.5 3.5 0 1015.5 14 3.5 3.5 0 0012 10.5zM18 6.75a1.25 1.25 0 11-1.25 1.25A1.25 1.25 0 0118 6.75z"
      />
    </svg>
  )
}

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

function YoutubeIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M21.6 7.2a3 3 0 00-2.11-2.12C17.74 4.5 12 4.5 12 4.5s-5.74 0-7.49.58A3 3 0 002.4 7.2 31.5 31.5 0 002 12a31.5 31.5 0 00.4 4.8 3 3 0 002.11 2.12c1.75.58 7.49.58 7.49.58s5.74 0 7.49-.58a3 3 0 002.11-2.12A31.5 31.5 0 0022 12a31.5 31.5 0 00-.4-4.8zM10 15.5v-7l6 3.5-6 3.5z"
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

function LinkedinIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8h4V23h-4V8zm7.5 0h3.84v2.05h.05c.53-1 1.84-2.05 3.79-2.05 4.05 0 4.8 2.67 4.8 6.14V23h-4v-7.1c0-1.69-.03-3.87-2.36-3.87-2.36 0-2.72 1.84-2.72 3.75V23h-4V8z"
      />
    </svg>
  )
}

function TiktokIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.5 3h3.1c.2 1.4.9 2.7 2 3.6 1.1.9 2.5 1.4 3.9 1.3v3.2c-1.4 0-2.8-.4-4-1.1v7.4c0 3.8-2.8 5.8-6.2 5.8-1.3 0-2.5-.3-3.6-.9-1.9-1.1-3-3.1-3-5.4 0-3.4 2.6-5.8 6.1-5.8.4 0 .8 0 1.2.1v3.3c-.4-.1-.7-.1-1.1-.1-1.6 0-2.8 1.1-2.8 2.7s1.2 2.8 2.9 2.8c1.8 0 2.9-1.1 2.9-3.1V3z"
      />
    </svg>
  )
}

export function SocialChannelIcon({
  channel,
  className,
}: {
  channel: SocialChannelKey
  className?: string
}) {
  switch (channel) {
    case 'instagram':
      return <InstagramIcon className={className} />
    case 'facebook':
      return <FacebookIcon className={className} />
    case 'youtube':
      return <YoutubeIcon className={className} />
    case 'vimeo':
      return <VimeoIcon className={className} />
    case 'linkedin':
      return <LinkedinIcon className={className} />
    case 'tiktok':
      return <TiktokIcon className={className} />
    default:
      return null
  }
}
