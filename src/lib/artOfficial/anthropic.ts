import Anthropic from '@anthropic-ai/sdk'

import { isPromptCacheEnabled } from './promptCache'

const apiKey = process.env.ANTHROPIC_API_KEY

/** @see https://docs.anthropic.com/en/docs/about-claude/models */
export const ART_OFFICIAL_MODEL =
  process.env.ART_OFFICIAL_MODEL ?? 'claude-sonnet-4-6'

function anthropicClientOptions(): ConstructorParameters<typeof Anthropic>[0] {
  const options: ConstructorParameters<typeof Anthropic>[0] = { apiKey: apiKey! }
  if (isPromptCacheEnabled()) {
    options.defaultHeaders = {
      'anthropic-beta': 'prompt-caching-2024-07-31',
    }
  }
  return options
}

export function getAnthropicOrNull(): Anthropic | null {
  if (!apiKey) return null
  return new Anthropic(anthropicClientOptions())
}

export function requireAnthropic(): Anthropic {
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is missing')
  }
  return new Anthropic(anthropicClientOptions())
}
