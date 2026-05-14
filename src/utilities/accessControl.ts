import type { Access, FieldAccess } from 'payload'

import { isArtistOrAdmin } from '@/access/isArtistOrAdmin'

/** Field-level `read` / `update` for private data (artist or admin only). */
export const artistOrAdmin: FieldAccess = ({ req: { user } }) => isArtistOrAdmin(user)

/** Collection `read`: staff see all; anonymous/public see published rows only. */
export const isPublished: Access = ({ req: { user } }) => {
  if (isArtistOrAdmin(user)) return true
  return { status: { equals: 'published' } }
}
