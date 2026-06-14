/** Map WP medium prose to Artworks `medium` select value; null when uncertain. */
export function inferMediumFromWp(mediumText: string | null | undefined): string | null {
  const m = (mediumText ?? '').toLowerCase()
  if (!m.trim()) return null
  if (m.includes('digital') && m.includes('collage')) return 'digital'
  if (m.includes('collage')) return 'photo-collage'
  if (m.includes('video') || m.includes('mp4')) return 'video'
  if (m.includes('digital')) return 'digital'
  if (m.includes('transfer')) return 'acrylic-photo-transfer-on-canvas'
  if (m.includes('mixed')) return 'mixed-media-on-canvas'
  if (m.includes('acrylic') && m.includes('canvas')) return 'acrylic-on-canvas'
  return null
}

export { BUILTIN_ARTWORK_MEDIUM_OPTIONS as ARTWORK_MEDIUM_OPTIONS } from './artworkMediumOptions'
