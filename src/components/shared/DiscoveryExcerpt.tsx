import { renderLexical } from '@/lib/lexical/renderLexical'

type Props = {
  data: unknown
  label?: string
}

/** Curated discovery pull — quote-style, distinct from entry text. */
export default function DiscoveryExcerpt({
  data,
  label = 'How this was found',
}: Props) {
  if (!data || typeof data !== 'object') return null
  const root = (data as { root?: unknown }).root
  if (!root) return null

  return (
    <figure className="discovery-excerpt">
      <figcaption className="discovery-excerpt__label">{label}</figcaption>
      <blockquote className="discovery-excerpt__body">{renderLexical(data)}</blockquote>
    </figure>
  )
}
