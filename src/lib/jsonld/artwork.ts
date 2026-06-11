import { generateArtworkJsonLd } from '@/utilities/generateArtworkJsonLd'

export type { GenerateArtworkJsonLdOptions as BuildArtworkJsonLdOptions } from '@/utilities/generateArtworkJsonLd'

/** @deprecated Use generateArtworkJsonLd from @/utilities/generateArtworkJsonLd */
export const buildArtworkJsonLd = generateArtworkJsonLd

export { generateArtworkJsonLd }
