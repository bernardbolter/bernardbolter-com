import type {
  CacheControlEphemeral,
  TextBlockParam,
  Tool,
} from '@anthropic-ai/sdk/resources/messages/messages'

/** Set `ART_OFFICIAL_PROMPT_CACHE=false` to disable Anthropic prompt caching. */
export function isPromptCacheEnabled(): boolean {
  return process.env.ART_OFFICIAL_PROMPT_CACHE !== 'false'
}

function cacheTtl(): '5m' | '1h' {
  return process.env.ART_OFFICIAL_CACHE_TTL === '1h' ? '1h' : '5m'
}

export function cacheControl(): CacheControlEphemeral {
  return { type: 'ephemeral', ttl: cacheTtl() }
}

export type SystemPromptParts = {
  /** Stable prefix: identity, practice knowledge, dialogue rules, field roadmap. */
  cachedPrefix: string
  /** Per-session tail: session type override, refinement preamble. */
  dynamicSuffix: string
}

export function buildAnthropicSystemBlocks(parts: SystemPromptParts): TextBlockParam[] {
  const cached = parts.cachedPrefix.trim()
  const dynamic = parts.dynamicSuffix.trim()

  if (!isPromptCacheEnabled()) {
    const full = [cached, dynamic].filter(Boolean).join('\n\n---\n\n')
    return [{ type: 'text', text: full }]
  }

  const blocks: TextBlockParam[] = []
  if (cached) {
    blocks.push({
      type: 'text',
      text: cached,
      cache_control: cacheControl(),
    })
  }
  if (dynamic) {
    blocks.push({ type: 'text', text: dynamic })
  }
  return blocks.length ? blocks : [{ type: 'text', text: '' }]
}

/** Cache breakpoint on the last tool definition (tools are identical every request). */
export function withToolCaching(tools: Tool[]): Tool[] {
  if (!isPromptCacheEnabled() || tools.length === 0) {
    return tools
  }
  return tools.map((tool, index) =>
    index === tools.length - 1 ? { ...tool, cache_control: cacheControl() } : tool,
  )
}
