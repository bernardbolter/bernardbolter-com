import { permanentRedirect } from 'next/navigation'
import type { Payload } from 'payload'

import { normalizeRedirectPath } from '@/lib/redirects/paths'
import { resolveRedirectTarget } from '@/lib/redirects/recordSlugRedirect'

/**
 * If fromPath has a redirect row, 308 to the terminal target (multi-hop).
 * Call before notFound() on session / throughline / bio-entry pages.
 */
export async function maybePermanentRedirect(
  payload: Payload,
  fromPath: string,
): Promise<void> {
  const toPath = await resolveRedirectTarget(payload, normalizeRedirectPath(fromPath))
  if (toPath && toPath !== normalizeRedirectPath(fromPath)) {
    permanentRedirect(toPath)
  }
}
