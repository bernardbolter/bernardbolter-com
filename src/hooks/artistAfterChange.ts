import type { CollectionAfterChangeHook } from 'payload'
import { revalidatePath, revalidateTag } from 'next/cache'

/** Bust frontend cache when the artist profile or info-panel links change. */
export const artistAfterChange: CollectionAfterChangeHook = () => {
  revalidateTag('artists')
  revalidatePath('/', 'layout')
  revalidatePath('/bio')
  revalidatePath('/statement')
  revalidatePath('/cv')
  revalidatePath('/contact')
  revalidatePath('/datenschutz')
}
