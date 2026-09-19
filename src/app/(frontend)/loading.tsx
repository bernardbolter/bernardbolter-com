/** Route fallback while the catalogue query is in flight. Identity lives on the page HTML. */
export default function FrontendLoading() {
  return <main className="relative min-h-screen w-full bg-surface-page" aria-hidden />
}
