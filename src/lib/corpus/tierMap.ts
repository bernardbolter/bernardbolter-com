import { CORPUS_BASE } from '@/lib/corpus/constants'

export type BuildTierMapOptions = {
  /**
   * Include Tier 3 (vision analysis HTML page). Default true for corpus ladders.
   * Pass false for per-artwork responses with zero vision analyses.
   */
  includeVisionTier?: boolean
}

/**
 * Self-description block on every corpus response.
 * Tier 3 addresses the HTML vision page — there is no separate JSON vision endpoint;
 * analyses also ship on Tier 4 as `art-official:visionAnalyses`.
 */
export function buildTierMap(
  baseUrl: string = CORPUS_BASE,
  options: BuildTierMapOptions = {},
): Record<string, unknown> {
  const includeVision = options.includeVisionTier !== false

  const map: Record<string, unknown> = {
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
  }

  if (includeVision) {
    map['3'] = {
      urlTemplate: `${baseUrl}/{slug}/vision`,
      scope: 'work',
      depth: 'vision',
      description: 'vision analysis — HTML page of model analyses for this work',
    }
  }

  map['4'] = {
    urlTemplate: `${baseUrl}/api/corpus/{slug}`,
    scope: 'work',
    depth: 'record',
    description: 'full record — all fields, all vision analyses',
  }

  map['5'] = {
    urlTemplate: `${baseUrl}/api/corpus/{slug}/sessions`,
    scope: 'work',
    depth: 'sessions',
    description: 'session transcripts — how it came to be known',
  }

  return map
}
