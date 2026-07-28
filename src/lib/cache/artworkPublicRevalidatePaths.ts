/** Public HTML + corpus API paths to bust after an artwork write. */
export function artworkPublicRevalidatePaths(slug: string): string[] {
  const trimmed = slug.trim()
  const paths = ['/', '/corpus', '/sessions', '/api/corpus', '/api/corpus/index']
  if (!trimmed) return paths

  const path = `/${trimmed}`
  paths.push(
    path,
    `${path}/vision`,
    `${path}/record`,
    `/api/corpus/${trimmed}`,
    `/api/corpus/${trimmed}?tier=5`,
  )
  return paths
}
