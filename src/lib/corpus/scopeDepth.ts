/**
 * Two axes for corpus responses — orthogonal to the tier ladder shorthand.
 *
 * scope × depth matrix:
 *            gist     survey     record      sessions
 * corpus     Tier 1   —          root feed   —
 * subset     (filt.)  Tier 2     —           —
 * work       (T3*)    —          Tier 4      Tier 5
 *
 * *Deferred reading endpoint — not built. Absent art-official:tier on root means
 * the bulk feed is not a ladder rung.
 *
 * `art-official:depth` values match the query vocabulary: gist | survey | record | sessions.
 * `?depth=survey` and `"art-official:depth": "survey"` are the same word.
 */

export type CorpusScope = 'corpus' | 'subset' | 'work'
export type CorpusContentDepth = 'gist' | 'survey' | 'record' | 'sessions'

export type CorpusEndpointKind =
  | 'index'
  | 'survey'
  | 'root'
  | 'record'
  | 'sessions'

/** Envelope fields for a corpus endpoint. Omits art-official:tier when not a ladder rung. */
export function buildScopeDepthEnvelope(
  kind: CorpusEndpointKind,
  options: { hasActiveFilters?: boolean } = {},
): Record<string, unknown> {
  switch (kind) {
    case 'index': {
      const scope: CorpusScope = options.hasActiveFilters ? 'subset' : 'corpus'
      return {
        'art-official:scope': scope,
        'art-official:depth': 'gist',
        'art-official:tier': 1,
      }
    }
    case 'survey':
      return {
        'art-official:scope': 'subset',
        'art-official:depth': 'survey',
        'art-official:tier': 2,
      }
    case 'root':
      // No art-official:tier — bulk export is the fourth matrix cell, not a rung.
      return {
        'art-official:scope': 'corpus',
        'art-official:depth': 'record',
        'art-official:feedRole': 'bulk-export',
      }
    case 'record':
      return {
        'art-official:scope': 'work',
        'art-official:depth': 'record',
        'art-official:tier': 4,
      }
    case 'sessions':
      return {
        'art-official:scope': 'work',
        'art-official:depth': 'sessions',
        'art-official:tier': 5,
      }
  }
}
