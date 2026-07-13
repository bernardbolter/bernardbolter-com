/** Frozen vision analysis prompt version — see docs/vision/vision-prompt-changelog.md */
export const VISION_PROMPT_VERSION = 'A-1.0' as const

/**
 * A-1.0 analysis instructions (prose output only).
 * Canonical copy: docs/vision/vision-analysis-prompt-spec.md
 */
export const VISION_ANALYSIS_PROMPT_A1_0 = `Analyze this artwork image through direct observation only. Do not name the artist, title, city, or historical period unless they are visibly legible in the image itself. Do not interpret intent or assign meaning — describe what is visible.

Write continuous prose, not bullet lists or structured JSON. Cover what you see, as relevant:

Composition and spatial structure — arrangement of forms, visual weight, dominant directions, figure–ground relationships, edges and intervals.

Colour palette — dominant hues, contrasts, temperature, saturation, and how colour areas relate.

Mood and atmospheric qualities — only as grounded in visible cues (light, surface, density), not psychological projection.

Formal and technical qualities — line, surface, texture, mark-making, evident media or process, scale relationships within the image.

Temporal-coexistence signals — where the image visibly holds elements from different times or registers (e.g. photographic source against painted field, digital overlay, historical and contemporary material co-present). Describe these cues precisely; do not resolve which period or register "wins."

Close with a short note on anything that resists confident visual description — ambiguous passages, occluded areas, or qualities you sense but cannot name with certainty.`

export const VISION_IMPORT_JSON_RULES = `Output ONLY valid JSON for Bernard Bolter Studio vision import. No markdown fences, no commentary outside the JSON.

Shape:
{
  "slug": "artwork-slug-here",
  "analyses": [
    {
      "text": "Full vision analysis prose.",
      "model": "claude-sonnet-4-6",
      "date": "YYYY-MM-DD"
    }
  ]
}

Rules:
- slug must match an existing published artwork slug
- text is the full A-1.0 prose analysis (multi-paragraph OK)
- model is the exact model version string you used
- date is ISO date YYYY-MM-DD (today if unsure)
- To append multiple analyses for one work, add more objects in analyses[]
- For multiple artworks, use: { "items": [ { "slug": "...", "analyses": [...] }, ... ] }

Prompt version in effect: A-1.0 (see docs/vision/vision-prompt-changelog.md).`

export type VisionPhoneWorkflowOptions = {
  slug?: string
  imageUrl?: string
}

/** Step 1: paste with image in a vision model chat. */
export function buildVisionAnalysisPrompt(options: VisionPhoneWorkflowOptions = {}): string {
  const slugLine = options.slug?.trim()
    ? `Artwork slug (for your reference only — do not include in the analysis prose): ${options.slug.trim()}`
    : 'Artwork slug: [fill in before running import JSON step]'

  const imageLine = options.imageUrl?.trim()
    ? `Image URL: ${options.imageUrl.trim()}`
    : 'Attach the artwork image or paste its direct R2 URL before this prompt.'

  return `${imageLine}

${slugLine}

Prompt version: ${VISION_PROMPT_VERSION}

${VISION_ANALYSIS_PROMPT_A1_0}`
}

/** Step 2: after prose analysis, ask the model to wrap for Studio import. */
export function buildVisionImportJsonPrompt(options: VisionPhoneWorkflowOptions = {}): string {
  const slugHint = options.slug?.trim()
    ? `Use slug: "${options.slug.trim()}"`
    : 'Set slug to the artwork slug'

  return `${VISION_IMPORT_JSON_RULES}

${slugHint}

Put the full A-1.0 prose analysis you just wrote into analyses[0].text.`
}

/** Single copy-paste workflow: analyze then emit import JSON. */
export function buildVisionPhoneWorkflowPrompt(options: VisionPhoneWorkflowOptions = {}): string {
  const slugLine = options.slug?.trim()
    ? `Artwork slug: ${options.slug.trim()}`
    : 'Artwork slug: [fill in]'

  const imageLine = options.imageUrl?.trim()
    ? `Image URL: ${options.imageUrl.trim()}`
    : 'Attach the artwork image or paste its direct R2 URL first.'

  return `${imageLine}

${slugLine}

Prompt version: ${VISION_PROMPT_VERSION}

First, follow these analysis instructions and write the full prose analysis:

${VISION_ANALYSIS_PROMPT_A1_0}

Then output ONLY valid JSON for Studio import (rules below):

${VISION_IMPORT_JSON_RULES}

Put the prose analysis into analyses[0].text. ${options.slug?.trim() ? `Use slug "${options.slug.trim()}".` : 'Set slug to the artwork slug.'}`
}
