/**
 * Visual claim preview for connector cards.
 * Full claim always remains in the HTML (preview + remainder).
 * Cuts only at sentence boundaries — never a character index mid-sentence.
 */

/** First sentence under this length may pull in a second (still sentence-bounded). */
const SHORT_FIRST_SENTENCE_MAX_CHARS = 120

/**
 * Split prose into sentences. Keeps trailing punctuation on each part.
 * Falls back to the whole string when no sentence end is found.
 */
export function splitClaimSentences(claim: string): string[] {
  const text = claim.replace(/\s+/g, ' ').trim()
  if (!text) return []

  const parts: string[] = []
  const re = /[^.!?]+(?:[.!?]+(?:["'\u201d\u2019)\]]*)?|$)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    const part = match[0].trim()
    if (part) parts.push(part)
  }
  return parts.length > 0 ? parts : [text]
}

export type ClaimPreviewParts = {
  /** Visible by default — the claim statement. */
  preview: string
  /** Evidence / elaboration; null when the whole claim is short enough to show. */
  remainder: string | null
}

/**
 * First sentence, or first two when the opening sentence is short.
 * Remainder is everything after, joined with spaces.
 */
export function splitClaimPreview(claim: string): ClaimPreviewParts {
  const sentences = splitClaimSentences(claim)
  if (sentences.length === 0) return { preview: '', remainder: null }
  if (sentences.length === 1) return { preview: sentences[0]!, remainder: null }

  let take = 1
  if (sentences[0]!.length <= SHORT_FIRST_SENTENCE_MAX_CHARS && sentences.length >= 2) {
    take = 2
  }

  if (take >= sentences.length) {
    return { preview: sentences.join(' '), remainder: null }
  }

  return {
    preview: sentences.slice(0, take).join(' '),
    remainder: sentences.slice(take).join(' '),
  }
}
