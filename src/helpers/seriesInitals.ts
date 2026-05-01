const seriesInitialsMap: Record<string, string> = {
    'a-colorful-history': 'ach',      // ach
    'art-collision': 'col',           // col
    'digital-city-series': 'dcs',     // dcs
    'megacities': 'meg',              // meg
    'breaking-down-art': 'war',       // war
    'vanishing-landscapes': 'van',    // van
    'og-oil-paintings': 'ogp',        // og
    'installations': 'ins',           // ins
    'photography': 'pho',             // pho
    'videos': 'vid',                  // sold (if needed)
}

/**
 * Returns the initials associated with the series slug
 * @params seriesSlug - the slug of the artwork series, from categories
 * @returns the 3 character initials, returns blank if not found
*/

export function getSeriesInitials(seriesSlug: string): string {
    const initials = seriesInitialsMap[seriesSlug.toLowerCase()]
    return initials || ''
}