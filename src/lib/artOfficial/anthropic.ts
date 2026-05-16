import Anthropic from '@anthropic-ai/sdk'

const apiKey = process.env.ANTHROPIC_API_KEY

export const ART_OFFICIAL_MODEL =
  process.env.ART_OFFICIAL_MODEL ?? 'claude-sonnet-4-20250514'

export function getAnthropicOrNull(): Anthropic | null {
  if (!apiKey) return null
  return new Anthropic({ apiKey })
}

export function requireAnthropic(): Anthropic {
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is missing')
  }
  return new Anthropic({ apiKey })
}
