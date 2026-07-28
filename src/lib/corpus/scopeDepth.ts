/**
 * Two axes for corpus responses — orthogonal to the tier ladder shorthand.
 *
 * scope × depth matrix:
 *            gist     survey     record      sessions
 * corpus     Tier 1   —          root feed   —
 * subset     (filt.)  Tier 2     —           —
 * work       (T3*)    —          Tier 4      Tier 5
 *
 * *Deferred reading endpoint — not built. Absent artism:tier on root means
 * the bulk feed is not a ladder rung.
 *
 * `artism:depth` values match the query vocabulary: gist | survey | record | sessions.
 * `?depth=survey` and `"artism:depth": "survey"` are the same word.
 */

export type CorpusScope = 'corpus' | 'subset' | 'work'
export type CorpusContentDepth = 'gist' | 'survey' | 'record' | 'sessions'

export type CorpusEndpointKind =
  | 'index'
  | 'survey'
  | 'root'
  | 'record'
  | 'sessions'

/** Envelope fields for a corpus endpoint. Omits artism:tier when not a ladder rung. */
export function buildScopeDepthEnvelope(
  kind: CorpusEndpointKind,
  options: { hasActiveFilters?: boolean } = {},
): Record<string, unknown> {
  switch (kind) {
    case 'index': {
      const scope: CorpusScope = options.hasActiveFilters ? 'subset' : 'corpus'
      return {
        'artism:scope': scope,
        'artism:depth': 'gist',
        'artism:tier': 1,
      }
    }
    case 'survey':
      return {
        'artism:scope': 'subset',
        'artism:depth': 'survey',
        'artism:tier': 2,
      }
    case 'root':
      // No artism:tier — bulk export is the fourth matrix cell, not a rung.
      return {
        'artism:scope': 'corpus',
        'artism:depth': 'record',
        'artism:feedRole': 'bulk-export',
      }
    case 'record':
      return {
        'artism:scope': 'work',
        'artism:depth': 'record',
        'artism:tier': 4,
      }
    case 'sessions':
      return {
        'artism:scope': 'work',
        'artism:depth': 'sessions',
        'artism:tier': 5,
      }
  }
}
