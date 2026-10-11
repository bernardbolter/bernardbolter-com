/** Normalize a public pathname for redirect storage / lookup. */
export function normalizeRedirectPath(path: string): string {
  const trimmed = path.trim()
  if (!trimmed) return ''
  let pathname = trimmed
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      pathname = new URL(trimmed).pathname
    }
  } catch {
    // keep as-is
  }
  if (!pathname.startsWith('/')) pathname = `/${pathname}`
  // strip trailing slash except root
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1)
  }
  return pathname
}

export function sessionPublicPath(sessionId: string): string {
  return normalizeRedirectPath(`/sessions/${sessionId.trim()}`)
}

export function throughlinePublicPath(slug: string): string {
  return normalizeRedirectPath(`/statement/throughlines/${slug.trim()}`)
}

export function bioEntryPublicPath(slug: string): string {
  return normalizeRedirectPath(`/bio/entries/${slug.trim()}`)
}

/** Paths middleware should check against the redirects table. */
export function isRedirectablePublicPath(pathname: string): boolean {
  const p = normalizeRedirectPath(pathname)
  return (
    p.startsWith('/sessions/') ||
    p.startsWith('/statement/throughlines/') ||
    p.startsWith('/bio/entries/')
  )
}
