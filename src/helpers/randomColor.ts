/**
 * Array of art-themed color hex codes extracted from vars.scss.
 * Used for dynamic styling elements like borders or backgrounds.
 */
const ART_COLORS: string[] = [
    '#d4af37', // $sold
    '#6D2E46', // $war
    '#9DC3C2', // $ach
    '#FC7753', // $meg
    '#F6BD60', // $dcs
    '#99C2A2', // $col
    '#7B8CDE', // $van
    '#395B0E', // $og
    '#A27E8E', // $ins
    '#2D4654', // $pho
    '#996a3e', // $vid
];

/**
 * Returns a random color hex code from the ART_COLORS list.
 * @returns {string} A hex color string (e.g., '#F6BD60').
 */
export function getRandomArtColor(): string {
    const randomIndex = Math.floor(Math.random() * ART_COLORS.length);
    return ART_COLORS[randomIndex];
}
