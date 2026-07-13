import type { CollectionAfterChangeHook } from 'payload'

import { revalidateArchive } from '@/lib/cache/revalidateArchive'

/** Bust frontend cache when the artist profile or info-panel links change. */
export const artistAfterChange: CollectionAfterChangeHook = ({ context }) => {
  if (context?.skipRevalidate) return

  revalidateArchive({
    tags: ['artists'],
    paths: ['/', '/bio', '/statement', '/cv', '/contact', '/datenschutz'],
  })
}
