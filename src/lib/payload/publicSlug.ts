/** True for slugs that should appear in sitemap, static params, and public APIs. */
export function isPublicCatalogueSlug(slug: string | null | undefined): boolean {
  const value = slug?.trim()
  if (!value) return false
  return !value.startsWith('__')
}
