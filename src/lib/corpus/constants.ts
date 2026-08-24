export const CORPUS_VERSION = '1.0'

export const CORPUS_ARTWORK_DEPTH = 3

/** Max chars for Tier-1 index `gist` (boundary-aware truncate). */
export const TIER1_GIST_MAX_CHARS = 200

/**
 * Resolvable JSON-LD namespace URI (content-negotiated at this path).
 * Compact prefix in emitted documents is `art-official:`.
 */
export const ART_OFFICIAL_NS = 'https://art-official.org/ns/'

/**
 * @deprecated Phase 4 alias — same IRI as ART_OFFICIAL_NS. Do not emit `artism:`.
 */
export const ARTISM_NS = ART_OFFICIAL_NS

export const CORPUS_BASE = 'https://bernardbolter.com'

/**
 * Page and corpus `@context`: schema.org types plus the resolving Art/Official namespace.
 */
export const CORPUS_CONTEXT = ['https://schema.org', ART_OFFICIAL_NS] as const

/** Default page sizes per list endpoint. */
export const CORPUS_INDEX_PER_PAGE = 50
export const CORPUS_SURVEY_PER_PAGE = 50
export const CORPUS_ROOT_PER_PAGE = 25
export const CORPUS_ROOT_MAX_PER_PAGE = 50
