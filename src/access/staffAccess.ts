import type { Access } from 'payload'

import { isArtistOrAdmin } from '@/access/isArtistOrAdmin'

/** CMS users with admin or artist role (Art/Official staff). */
export const staffCollectionAccess: Access = ({ req: { user } }) => isArtistOrAdmin(user)

/** Public read; create/update/delete for staff only. */
export const publicReadStaffCollectionAccess: Access = {
  read: () => true,
  create: ({ req: { user } }) => isArtistOrAdmin(user),
  update: ({ req: { user } }) => isArtistOrAdmin(user),
  delete: ({ req: { user } }) => isArtistOrAdmin(user),
}

/** Authenticated read; staff write. */
export const authenticatedReadStaffWrite: Access = {
  read: ({ req: { user } }) => Boolean(user),
  create: ({ req: { user } }) => isArtistOrAdmin(user),
  update: ({ req: { user } }) => isArtistOrAdmin(user),
  delete: ({ req: { user } }) => isArtistOrAdmin(user),
}
