import { CORPUS_BASE } from '@/lib/corpus/constants'

/**
 * Self-description block on every corpus response. Tier 3 is intentionally absent.
 * Nested `scope` / `depth` use the same controlled values as `artism:scope` / `artism:depth`.
 */
export function buildTierMap(baseUrl: string = CORPUS_BASE): Record<string, unknown> {
  return {
    '1': {
      url: `${baseUrl}/api/corpus/index`,
      scope: 'corpus',
      depth: 'gist',
      description: 'triage — identity, series, gist',
    },
    '2': {
      url: `${baseUrl}/api/corpus/index?depth=survey`,
      scope: 'subset',
      depth: 'survey',
      description: 'narrowing — description, intent, colors, keywords',
    },
    '4': {
      urlTemplate: `${baseUrl}/api/corpus/{slug}`,
      scope: 'work',
      depth: 'record',
      description: 'full record — all fields, all vision analyses',
    },
    '5': {
      urlTemplate: `${baseUrl}/api/corpus/{slug}/sessions`,
      scope: 'work',
      depth: 'sessions',
      description: 'session transcripts — how it came to be known',
    },
  }
}
