import { revalidatePath, revalidateTag } from 'next/cache'

import { pathsToAbsoluteUrls, purgeCloudflareCache } from './purgeCloudflare'

const CORPUS_PATH = '/api/corpus'

/**
 * Bust local Next.js ISR and (when configured) Cloudflare edge cache for public archive routes.
 */
export function revalidateArchive(options: { paths: string[]; tags?: string[] }): void {
  const { paths, tags = [] } = options

  try {
    for (const tag of tags) {
      revalidateTag(tag, 'max')
    }

    for (const path of paths) {
      if (path === '/') {
        revalidatePath('/', 'layout')
      } else {
        revalidatePath(path)
      }
    }
  } catch {
    // No Next.js static generation store (seed scripts, tests)
  }

  const files = pathsToAbsoluteUrls([...paths, CORPUS_PATH])
  void purgeCloudflareCache(files).catch(() => {
    // Purge failures must not block saves; logs can be added if needed
  })
}
