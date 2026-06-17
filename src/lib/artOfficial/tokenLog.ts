import type { SessionPhase } from './sessionPhase'

export type TokenLogEntry = {
  turn: number
  phase: SessionPhase
  model: string
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  timestamp: string
}

export type AnthropicUsageSnapshot = {
  input_tokens?: number
  output_tokens?: number
  cache_read_input_tokens?: number | null
  cache_creation_input_tokens?: number | null
}

export function aggregateUsage(
  acc: Omit<TokenLogEntry, 'turn' | 'phase' | 'model' | 'timestamp'>,
  usage: AnthropicUsageSnapshot,
): void {
  acc.inputTokens += usage.input_tokens ?? 0
  acc.outputTokens += usage.output_tokens ?? 0
  acc.cacheReadTokens += usage.cache_read_input_tokens ?? 0
  acc.cacheWriteTokens += usage.cache_creation_input_tokens ?? 0
}

export function appendTokenLog(
  existing: unknown,
  entry: TokenLogEntry,
): TokenLogEntry[] {
  const prior = Array.isArray(existing)
    ? (existing as TokenLogEntry[]).filter(
        (row): row is TokenLogEntry =>
          typeof row === 'object' &&
          row !== null &&
          typeof row.turn === 'number',
      )
    : []
  return [...prior, entry]
}

export function countTurnsInPhase(
  tokenLog: unknown,
  phase: SessionPhase,
): number {
  if (!Array.isArray(tokenLog)) return 0
  return (tokenLog as TokenLogEntry[]).filter((row) => row?.phase === phase).length
}
