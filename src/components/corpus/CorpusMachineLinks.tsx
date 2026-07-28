/**
 * Server-rendered machine-API links for HTML pages.
 * Must stay in the initial HTML (not client-injected) so crawlers see them.
 */
export default function CorpusMachineLinks(props: {
  slug: string
  /** When false, omit the sessions JSON link (no completed sessions for this work). */
  hasSessions?: boolean
  /** On record page: also link the corpus index ladder entry. */
  includeIndex?: boolean
  className?: string
}) {
  const { slug, hasSessions = false, includeIndex = false, className } = props
  const encoded = encodeURIComponent(slug)

  return (
    <p className={className ?? 'corpus-page__links'}>
      {includeIndex ? (
        <a href="/api/corpus/index" className="still-being-written__session-link">
          Corpus index (JSON)
        </a>
      ) : null}
      <a href={`/api/corpus/${encoded}`} className="still-being-written__session-link">
        Machine record (JSON)
      </a>
      {hasSessions ? (
        <a
          href={`/api/corpus/${encoded}/sessions`}
          className="still-being-written__session-link"
        >
          Session data (JSON)
        </a>
      ) : null}
    </p>
  )
}
