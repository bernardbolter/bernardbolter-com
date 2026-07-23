/** Server-rendered early in homepage HTML so truncating fetchers still see the corpus URL. */
export function CorpusDiscoveryLink() {
  return (
    <p className="corpus-discovery-link">
      <a href="/api/corpus/index">Machine-readable archive index</a>
    </p>
  )
}
