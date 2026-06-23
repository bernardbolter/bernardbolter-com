export type SocialPlatform = 'instagram' | 'tiktok' | 'youtube' | 'linkedin' | 'facebook' | 'vimeo'

function withHttps(url: string): string {
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith('//')) return `https:${url}`
  return `https://${url.replace(/^\/+/, '')}`
}

function stripAt(value: string): string {
  return value.replace(/^@+/, '').replace(/^\/+/, '')
}

const PLATFORM_URL_BUILDERS: Record<SocialPlatform, (value: string) => string> = {
  instagram: (value) => {
    const handle = stripAt(value.replace(/^instagram\.com\//i, '').split(/[/?#]/)[0] ?? '')
    return `https://www.instagram.com/${handle}/`
  },
  tiktok: (value) => {
    const handle = stripAt(value.replace(/^tiktok\.com\//i, '').split(/[/?#]/)[0] ?? '')
    return `https://www.tiktok.com/@${handle}`
  },
  youtube: (value) => {
    const trimmed = value.replace(/^youtube\.com\//i, '').replace(/^youtu\.be\//i, '')
    if (trimmed.startsWith('@') || trimmed.startsWith('channel/') || trimmed.startsWith('c/')) {
      return withHttps(`www.youtube.com/${trimmed.replace(/^\/+/, '')}`)
    }
    const handle = stripAt(trimmed.split(/[/?#]/)[0] ?? '')
    return `https://www.youtube.com/@${handle}`
  },
  linkedin: (value) => {
    const path = value.replace(/^linkedin\.com\//i, '').replace(/^\/+/, '')
    if (path.startsWith('in/') || path.startsWith('company/')) {
      return withHttps(`www.linkedin.com/${path}`)
    }
    return withHttps(`www.linkedin.com/in/${stripAt(path.split(/[/?#]/)[0] ?? '')}`)
  },
  facebook: (value) => {
    const path = value.replace(/^facebook\.com\//i, '').replace(/^\/+/, '')
    return withHttps(`www.facebook.com/${stripAt(path.split(/[/?#]/)[0] ?? '')}`)
  },
  vimeo: (value) => {
    const path = value.replace(/^vimeo\.com\//i, '').replace(/^\/+/, '')
    return withHttps(`vimeo.com/${stripAt(path.split(/[/?#]/)[0] ?? '')}`)
  },
}

/** Turn CMS handles or partial URLs into absolute profile links for href attributes. */
export function normalizeSocialUrl(
  raw: string | null | undefined,
  platform: SocialPlatform,
): string | null {
  const value = raw?.trim()
  if (!value) return null

  if (/^https?:\/\//i.test(value) || value.startsWith('//')) {
    return withHttps(value)
  }

  if (value.includes('.')) {
    return withHttps(value)
  }

  return PLATFORM_URL_BUILDERS[platform](value)
}
