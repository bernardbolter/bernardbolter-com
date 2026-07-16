export const CORPUS_VERSION = '1.0'

export const CORPUS_ARTWORK_DEPTH = 3

/** Max chars for Tier-1 index `gist` (boundary-aware truncate). */
export const TIER1_GIST_MAX_CHARS = 200

export const CORPUS_CONTEXT = {
  '@vocab': 'https://schema.org/',
  artism: 'https://artism.org/schema/',
} as const
