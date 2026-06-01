/**
 * Quick check: two identical requests should show cache_creation then cache_read.
 * Usage: npx tsx src/scripts/test-prompt-cache.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })

import Anthropic from '@anthropic-ai/sdk'

import { ANTHROPIC_TOOL_SCHEMAS } from '@/lib/artOfficial/agentTools'
import {
  buildAnthropicSystemBlocks,
  isPromptCacheEnabled,
  withToolCaching,
} from '@/lib/artOfficial/promptCache'

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY missing')
    process.exit(1)
  }

  console.log('ART_OFFICIAL_PROMPT_CACHE enabled:', isPromptCacheEnabled())
  console.log('ART_OFFICIAL_CACHE_TTL:', process.env.ART_OFFICIAL_CACHE_TTL ?? '5m (default)')

  const prefix = `${'Stable system prefix for cache test. '.repeat(120)}\nPractice knowledge block.`
  const system = buildAnthropicSystemBlocks({
    cachedPrefix: prefix,
    dynamicSuffix: 'SESSION TYPE: artwork-cataloguing test',
  })
  const tools = withToolCaching(ANTHROPIC_TOOL_SCHEMAS)

  const client = new Anthropic({ apiKey })
  const model = process.env.ART_OFFICIAL_MODEL ?? 'claude-sonnet-4-6'

  async function call(label: string) {
    const response = await client.messages.create({
      model,
      max_tokens: 16,
      system,
      tools,
      messages: [{ role: 'user', content: 'Reply with one word: ok' }],
    })
    const usage = response.usage as {
      input_tokens?: number
      cache_creation_input_tokens?: number
      cache_read_input_tokens?: number
    }
    console.log(label, {
      input_tokens: usage.input_tokens,
      cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
      cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
    })
  }

  await call('call1')
  await call('call2')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
