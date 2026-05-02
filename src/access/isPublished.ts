/** For collection/query access when gating on `_status` or `status`. */
export function isPublishedArtwork(doc: { status?: string | null } | null | undefined): boolean {
  return doc?.status === 'published'
}
