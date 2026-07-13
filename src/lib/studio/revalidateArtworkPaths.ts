import { revalidatePath, revalidateTag } from 'next/cache'

/** Bust ISR for artwork + vision pages after archive imports. */
export function revalidateArtworkPaths(slug: string): void {
  const trimmed = slug.trim()
  if (!trimmed) return

  try {
    revalidateTag('artworks', 'max')
    revalidatePath('/', 'layout')
    const path = `/${trimmed}`
    revalidatePath(path)
    revalidatePath(`${path}/vision`)
  } catch {
    // No Next.js cache context (scripts, tests)
  }
}
