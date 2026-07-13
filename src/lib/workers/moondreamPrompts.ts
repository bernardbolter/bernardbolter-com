import type { FieldNoteShotType } from '@/lib/workers/fieldNotePipelineConstants'
import { FIELD_NOTE_SHOT_TYPES } from '@/lib/workers/fieldNotePipelineConstants'
import type { FieldNote } from '@/payload-types'

/** Appended to every Moondream prompt — see docs/vision/vision-analysis-prompt-spec.md §2. */
export const MOONDREAM_TAG_SUFFIX =
  'Answer only with a short list of tags, 5 to 10 words or short phrases, comma-separated. No sentences.'

const SHOT_TYPE_PROMPT_BODY: Record<FieldNoteShotType, string> = {
  HOOK: 'List: is a person visible, are they facing the camera, is the background in focus or blurred, what is the lighting (bright/dim/golden/overcast), is text or a location landmark visible.',
  VERSE: "List: person's position in frame (left/center/right), person's pose (standing/gesturing/moving), the artwork or artwork type visible behind them, how much of the artwork is visible (full/partial/cropped), lighting quality, any crowd or bystanders visible.",
  ARRIVE: 'List: direction of movement if visible, what is approaching or coming into frame, foreground/background separation, walking or stationary, any landmark visible.',
  DETAIL: 'List: which part of the object is shown (face/hands/texture/inscription/surface/other), material if identifiable (bronze/stone/paint/other), lighting direction and quality, any visible wear, patina, or damage, dominant colors.',
  WIDE: 'List: how small or large the person appears relative to the artwork or setting, overall setting type (park/street/museum exterior/gallery/urban), sky visible or not, time-of-day light cues, symmetry or framing notes.',
  WALK: 'List: setting type, motion blur present or not, people count visible, notable background elements, lighting.',
  CROWD: 'List: number of people visible (none/few/several/many), are they looking toward the subject or elsewhere, any visible reaction (smiling/filming/ignoring/stopped), setting density (empty/sparse/busy).',
  TALK: "List: is the person's face clearly visible, close-up or medium shot, background blurred or sharp, apparent mood from posture (relaxed/tired/animated/neutral), lighting quality.",
  AMBIENT: 'List: setting type, static or any movement in frame, lighting quality, dominant colors, any people present.',
  BTS: 'List: what activity is visible (setup/walking/talking/adjusting equipment/other), people count, setting type, whether performance has started or not.',
}

const PHOTO_PROMPT_BODY =
  'List: main subject, setting type, lighting quality, dominant colors, any text or landmark visible.'

const GENERIC_FALLBACK_BODY =
  'List: main subject, setting, lighting, notable objects, 5 to 10 tags.'

function isShotType(value: string): value is FieldNoteShotType {
  return (FIELD_NOTE_SHOT_TYPES as readonly string[]).includes(value)
}

function buildPrompt(body: string): string {
  return `${body} ${MOONDREAM_TAG_SUFFIX}`
}

export type MoondreamPromptInput = {
  shotType?: string | null
  mediaType?: FieldNote['mediaType'] | null
  slateParseStatus?: string | null
}

/**
 * Select the Moondream prompt for a keyframe.
 * Uses shotType when slate parse succeeded; photo mediaType has its own prompt; otherwise generic fallback.
 */
export function getMoondreamPrompt(input: MoondreamPromptInput): string {
  if (input.mediaType === 'photo') {
    return buildPrompt(PHOTO_PROMPT_BODY)
  }

  const normalizedShot = input.shotType?.trim().toUpperCase()
  if (
    normalizedShot &&
    isShotType(normalizedShot) &&
    input.slateParseStatus !== 'not-found'
  ) {
    return buildPrompt(SHOT_TYPE_PROMPT_BODY[normalizedShot])
  }

  return buildPrompt(GENERIC_FALLBACK_BODY)
}

/** Split Moondream comma-separated output into normalized tag strings. */
export function parseMoondreamTags(raw: string): string[] {
  return raw
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
}
