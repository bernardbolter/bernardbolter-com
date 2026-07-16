/**
 * Moondream prompts + parsers for artwork catalogue enrichment.
 * Prose → visionAnalyses; structured side queries fill empty metadata only.
 */

export const ARTWORK_MOONDREAM_VISION_PROMPT = [
  'Describe this artwork in clear prose for an archive catalogue.',
  'Cover composition, dominant colours, materials or medium cues if visible,',
  'spatial structure, and any notable motifs or figures.',
  'Write 2–4 short paragraphs. No bullet lists. No hashtags. No speculation about market value.',
].join(' ')

export const ARTWORK_MOONDREAM_COLORS_PROMPT = [
  'List the 4 to 6 dominant colours in this artwork as hex codes only.',
  'Reply with a comma-separated list like #1a2b3c, #ffffff. No other words.',
].join(' ')

export const ARTWORK_MOONDREAM_TAGS_PROMPT = [
  'List 5 to 12 short visual subject or style tags for this artwork.',
  'Reply as a comma-separated list of lowercase phrases.',
  'No sentences. No hashtags. Example: urban skyline, collage, architectural facade',
].join(' ')

export const ARTWORK_MOONDREAM_COMPOSITION_PROMPT = [
  'In 2 to 3 short sentences, describe the composition and visual weight of this artwork.',
  'No bullet lists. No hashtags.',
].join(' ')

const HEX_RE = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g

export function parseMoondreamHexColors(raw: string, max = 6): string[] {
  const matches = raw.match(HEX_RE) ?? []
  const seen = new Set<string>()
  const out: string[] = []
  for (const match of matches) {
    const hex = normalizeHex(match)
    if (!hex || seen.has(hex)) continue
    seen.add(hex)
    out.push(hex)
    if (out.length >= max) break
  }
  return out
}

function normalizeHex(value: string): string | null {
  const raw = value.trim()
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(raw)) return null
  if (raw.length === 4) {
    const [, r, g, b] = raw
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return raw.toLowerCase()
}

export function parseMoondreamKeywordList(raw: string, max = 12): string[] {
  const cleaned = raw
    .replace(/^[^a-zA-Z0-9]+/, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) return []

  const parts = cleaned
    .split(/,|\n|;/)
    .map((part) =>
      part
        .replace(/^[-*#\d.)\s]+/, '')
        .replace(/[.]+$/, '')
        .trim()
        .toLowerCase(),
    )
    .filter((part) => part.length >= 2 && part.length <= 48 && !part.includes('http'))

  const seen = new Set<string>()
  const out: string[] = []
  for (const part of parts) {
    if (seen.has(part)) continue
    seen.add(part)
    out.push(part)
    if (out.length >= max) break
  }
  return out
}

/** First 1–2 sentences for empty descriptionShort (Tier-2-ish gap fill). */
export function descriptionShortFromProse(prose: string, maxChars = 320): string | null {
  const text = prose.replace(/\s+/g, ' ').trim()
  if (!text) return null
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text]
  const short = sentences
    .slice(0, 2)
    .map((s) => s.trim())
    .join(' ')
  if (short.length <= maxChars) return short
  const cut = short.slice(0, maxChars)
  const lastSpace = cut.lastIndexOf(' ')
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : maxChars).trimEnd()}…`
}
