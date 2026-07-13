import type {
  FieldNoteShotType,
  FieldNoteSlateParseStatus,
  FieldNoteVerdict,
} from '@/lib/workers/fieldNotePipelineConstants'
import { FIELD_NOTE_SHOT_TYPES, FIELD_NOTE_VERDICTS } from '@/lib/workers/fieldNotePipelineConstants'

const HEAD_SLATE_REGEX =
  /slate[.,]?\s*episode\s+(\w+)[.,]?\s*(hook|verse|arrive|detail|wide|walk|crowd|talk|ambient|bts)[.,]?\s*(?:take\s+(\w+))?/i

const BROLL_LIBRARY_REGEX = /slate[.,]?\s*b-?roll\s+library/i

const MUSEUM_REEL_REGEX = /slate[.,]?\s*museum\s+reel[.,]?\s*(.+?)(?:[.,]|$)/i

const TAIL_VERDICT_REGEX = /(keeper|scrap|maybe)\s*\.?\s*$/i

const WORD_NUMBERS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
}

export type SlateParseResult = {
  episode: string | null
  shotType: FieldNoteShotType | null
  take: number | null
  verdict: FieldNoteVerdict | null
  slateParseStatus: FieldNoteSlateParseStatus
  /** Set when a non-episode slate pattern matches (b-roll library, museum reel). */
  locationName: string | null
}

function tokenizeWords(text: string): string[] {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

function firstWords(text: string, count: number): string {
  return tokenizeWords(text).slice(0, count).join(' ')
}

function lastWords(text: string, count: number): string {
  const words = tokenizeWords(text)
  return words.slice(Math.max(0, words.length - count)).join(' ')
}

function parseNumberToken(token: string): number | null {
  const trimmed = token.trim().toLowerCase()
  if (!trimmed) return null

  if (/^\d+$/.test(trimmed)) {
    const value = Number.parseInt(trimmed, 10)
    return Number.isFinite(value) && value > 0 ? value : null
  }

  return WORD_NUMBERS[trimmed] ?? null
}

/** Normalize episode token: "one" → e01, "1" → e01, "e01" unchanged. */
export function normalizeEpisodeToken(token: string): string | null {
  const trimmed = token.trim()
  if (!trimmed) return null

  const episodeMatch = /^e(\d+)$/i.exec(trimmed)
  if (episodeMatch) {
    const num = Number.parseInt(episodeMatch[1]!, 10)
    return Number.isFinite(num) && num > 0 ? `e${String(num).padStart(2, '0')}` : null
  }

  const asNumber = parseNumberToken(trimmed)
  if (asNumber != null) {
    return `e${String(asNumber).padStart(2, '0')}`
  }

  return trimmed.toLowerCase()
}

function normalizeShotType(token: string): FieldNoteShotType | null {
  const upper = token.trim().toUpperCase()
  return (FIELD_NOTE_SHOT_TYPES as readonly string[]).includes(upper)
    ? (upper as FieldNoteShotType)
    : null
}

function normalizeVerdict(token: string): FieldNoteVerdict | null {
  const lower = token.trim().toLowerCase()
  return (FIELD_NOTE_VERDICTS as readonly string[]).includes(lower)
    ? (lower as FieldNoteVerdict)
    : null
}

function parseHead(headText: string): Pick<
  SlateParseResult,
  'episode' | 'shotType' | 'take' | 'slateParseStatus' | 'locationName'
> {
  const episodeMatch = HEAD_SLATE_REGEX.exec(headText)
  if (episodeMatch) {
    const episode = normalizeEpisodeToken(episodeMatch[1] ?? '')
    const shotType = normalizeShotType(episodeMatch[2] ?? '')
    const take = episodeMatch[3] ? parseNumberToken(episodeMatch[3]) : null

    if (episode && shotType) {
      return {
        episode,
        shotType,
        take,
        slateParseStatus: 'parsed',
        locationName: null,
      }
    }

    return {
      episode,
      shotType,
      take,
      slateParseStatus: 'partial',
      locationName: null,
    }
  }

  if (BROLL_LIBRARY_REGEX.test(headText)) {
    return {
      episode: null,
      shotType: null,
      take: null,
      slateParseStatus: 'parsed',
      locationName: 'B-roll library',
    }
  }

  const museumMatch = MUSEUM_REEL_REGEX.exec(headText)
  if (museumMatch) {
    const name = museumMatch[1]?.trim().replace(/[.,]+$/, '')
    return {
      episode: null,
      shotType: null,
      take: null,
      slateParseStatus: 'parsed',
      locationName: name || 'Museum reel',
    }
  }

  return {
    episode: null,
    shotType: null,
    take: null,
    slateParseStatus: 'not-found',
    locationName: null,
  }
}

function parseTail(tailText: string): FieldNoteVerdict | null {
  const match = TAIL_VERDICT_REGEX.exec(tailText.trim())
  if (!match?.[1]) return null
  return normalizeVerdict(match[1])
}

/**
 * Parse spoken slate fields from a Whisper transcript.
 * Head: first ~15 words. Tail: last ~5 words. Never guesses on failure.
 */
export function parseSlateFromTranscript(transcript: string): SlateParseResult {
  const trimmed = transcript.trim()
  if (!trimmed) {
    return {
      episode: null,
      shotType: null,
      take: null,
      verdict: null,
      slateParseStatus: 'not-found',
      locationName: null,
    }
  }

  const head = parseHead(firstWords(trimmed, 15))
  const verdict = parseTail(lastWords(trimmed, 5))

  return {
    ...head,
    verdict,
  }
}
