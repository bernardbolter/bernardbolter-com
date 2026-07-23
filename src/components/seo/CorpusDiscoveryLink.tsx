/** Server-rendered homepage link for crawlers that only follow visible `<a>` tags. */
export function CorpusDiscoveryLink() {
  return (
    <p className="corpus-discovery-link">
      <a href="/api/corpus/index">Machine-readable archive index</a>
    </p>
  )
}
