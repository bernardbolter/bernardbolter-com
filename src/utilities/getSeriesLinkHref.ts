/** Centralized series URL — swap target when a dedicated series microsite ships. */
export function getSeriesLinkHref(slug: string): string {
  return `/series/${slug}`
}
