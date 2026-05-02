import type { FieldAccess } from 'payload'

/** Logged-in CMS users with `admin` or `artist` role may read/update private artwork fields. */
export function isArtistOrAdmin(user: unknown): boolean {
  if (!user || typeof user !== 'object') return false
  const roles = (user as { roles?: string[] | null }).roles
  if (!Array.isArray(roles)) return false
  return roles.includes('admin') || roles.includes('artist')
}

/** Hide pricing, sales, and provenance from anonymous/API consumers; staff only. */
export const privateFieldAccess: {
  read: FieldAccess
  update: FieldAccess
} = {
  read: ({ req: { user } }) => isArtistOrAdmin(user),
  update: ({ req: { user } }) => isArtistOrAdmin(user),
}

/** Public read (e.g. editions on the website); CMS edits still staff-only. */
export const publicReadStaffWriteAccess: {
  read: FieldAccess
  update: FieldAccess
} = {
  read: () => true,
  update: ({ req: { user } }) => isArtistOrAdmin(user),
}
