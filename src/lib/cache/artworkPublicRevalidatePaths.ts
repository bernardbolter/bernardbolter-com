/** Public HTML paths to bust after an artwork write (corpus APIs use revalidateCorpusFeed). */
export function artworkPublicRevalidatePaths(slug: string): string[] {
  const trimmed = slug.trim()
  const paths = ['/', '/corpus', '/sessions']
  if (!trimmed) return paths

  const path = `/${trimmed}`
  paths.push(path, `${path}/vision`, `${path}/record`)
  return paths
}
