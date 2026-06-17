import type { Payload } from 'payload'

import { requireAnthropic } from './anthropic'
import { ART_OFFICIAL_MODEL_VISION } from './sessionPhase'
export type ImageAnalysisResult = {
  dominantColors: string[]
  aspectRatio: 'landscape' | 'portrait' | 'square'
  detectedSubjects: string[]
  compositionalNotes: string
  paintedFieldColors: string[]
  paintedFieldRects: Array<{ color: string; x: string; y: string; w: string; h: string }>
}

const ANALYSIS_PROMPT = `You are analysing an artwork photograph (still image) for catalogue metadata.

Return ONLY valid JSON (no markdown) with this shape:
{
  "dominantColors": ["#hex", ...],
  "aspectRatio": "landscape" | "portrait" | "square",
  "detectedSubjects": ["short phrases"],
  "compositionalNotes": "2-4 sentences on composition and visual weight",
  "paintedFieldColors": ["#hex", "#hex", "#hex"],
  "paintedFieldRects": [
    { "color": "#hex", "x": "8%", "y": "12%", "w": "30%", "h": "20%" }
  ]
}

Rules:
- paintedFieldColors: exactly 3 hex values from acrylic painted field areas, NOT from the photographic transfer.
- paintedFieldRects: 1-4 rectangles over painted fields; x,y,w,h as percentage strings.
- dominantColors: up to 6 hex swatches from the whole image.`

function parseAnalysisJson(text: string): ImageAnalysisResult | null {
  const trimmed = text.trim()
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null
  try {
    const parsed = JSON.parse(jsonMatch[0]) as ImageAnalysisResult
    return {
      dominantColors: Array.isArray(parsed.dominantColors) ? parsed.dominantColors : [],
      aspectRatio:
        parsed.aspectRatio === 'portrait' || parsed.aspectRatio === 'square'
          ? parsed.aspectRatio
          : 'landscape',
      detectedSubjects: Array.isArray(parsed.detectedSubjects)
        ? parsed.detectedSubjects.map(String)
        : [],
      compositionalNotes:
        typeof parsed.compositionalNotes === 'string' ? parsed.compositionalNotes : '',
      paintedFieldColors: Array.isArray(parsed.paintedFieldColors)
        ? parsed.paintedFieldColors.slice(0, 3)
        : [],
      paintedFieldRects: Array.isArray(parsed.paintedFieldRects)
        ? parsed.paintedFieldRects.slice(0, 4)
        : [],
    }
  } catch {
    return null
  }
}

export async function runImageAnalysis(args: {
  mediaId: number
  payload: Payload
  user?: { id: number | string }
}): Promise<ImageAnalysisResult> {
  const media = await args.payload.findByID({
    collection: 'media',
    id: args.mediaId,
    depth: 0,
    overrideAccess: args.user ? false : true,
    user: args.user as never,
  })

  const imageUrl = media.url
  if (!imageUrl) {
    throw new Error('Media record has no public URL for vision analysis.')
  }

  const anthropic = requireAnthropic()
  const response = await anthropic.messages.create({
    model: ART_OFFICIAL_MODEL_VISION,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'url', url: imageUrl },
          },
          { type: 'text', text: ANALYSIS_PROMPT },
        ],
      },
    ],
  })

  const textBlock = response.content.find((b) => b.type === 'text')
  const text = textBlock && textBlock.type === 'text' ? textBlock.text : ''
  const parsed = parseAnalysisJson(text)

  if (!parsed) {
    return {
      dominantColors: [],
      aspectRatio: 'landscape',
      detectedSubjects: [],
      compositionalNotes: 'Image analysis could not be parsed; review manually.',
      paintedFieldColors: [],
      paintedFieldRects: [],
    }
  }

  return parsed
}
