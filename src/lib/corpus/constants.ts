export const CORPUS_VERSION = '1.0'

export const CORPUS_ARTWORK_DEPTH = 3

/** Max chars for Tier-1 index `gist` (boundary-aware truncate). */
export const TIER1_GIST_MAX_CHARS = 200

/**
 * The artism vocabulary namespace.
 * artism.org/schema/ currently returns 404. bernardbolter.com/schema/ resolves (308 → served doc).
 * DECISION GATE — September 1, 2026:
 *   If artism.org/schema/ is live and serving the vocabulary → leave as artism.org.
 *   If not → change this one line to 'https://bernardbolter.com/schema/'.
 * Whichever loses MUST permanently redirect to the winner. A dead namespace URI is
 * worse than one that moved.
 */
export const ARTISM_NS = 'https://artism.org/schema/'

export const CORPUS_BASE = 'https://bernardbolter.com'

export const CORPUS_CONTEXT = {
  '@vocab': 'https://schema.org/',
  artism: ARTISM_NS,
} as const

/** Default page sizes per list endpoint. */
export const CORPUS_INDEX_PER_PAGE = 250
export const CORPUS_SURVEY_PER_PAGE = 50
export const CORPUS_ROOT_PER_PAGE = 25
export const CORPUS_ROOT_MAX_PER_PAGE = 50
