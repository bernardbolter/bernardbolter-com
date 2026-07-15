import Link from 'next/link'

type Props = {
  slug?: string | null
  current: 'corpus' | 'artwork' | 'vision' | 'record' | 'sessions'
}

export default function CorpusLadder({ slug, current }: Props) {
  const artworkHref = slug ? `/${slug}` : null
  const visionHref = slug ? `/${slug}/vision` : null
  const recordHref = slug ? `/${slug}/record` : null
  const sessionsHref = slug ? `/sessions?artwork=${encodeURIComponent(slug)}` : '/sessions'

  const items: Array<{ key: Props['current']; label: string; href: string | null }> = [
    { key: 'corpus', label: 'Corpus', href: '/corpus' },
    { key: 'artwork', label: 'Artwork', href: artworkHref },
    { key: 'vision', label: 'Vision', href: visionHref },
    { key: 'record', label: 'Record', href: recordHref },
    { key: 'sessions', label: 'Sessions', href: sessionsHref },
  ]

  return (
    <nav className="corpus-ladder" aria-label="Corpus tier ladder">
      {items.map((item, index) => {
        const isCurrent = item.key === current
        const disabled = !item.href
        return (
          <span key={item.key} className="corpus-ladder__item">
            {index > 0 ? <span className="corpus-ladder__sep">/</span> : null}
            {disabled || isCurrent ? (
              <span className={isCurrent ? 'corpus-ladder__current' : 'corpus-ladder__muted'}>
                {item.label}
              </span>
            ) : (
              <Link href={item.href!} className="corpus-ladder__link">
                {item.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
