import { CELL_PAD } from '@/lib/artwork/gridRealSize'

/** Fraction of CELL_PAD used when below the absolute cap. */
export const TRANSLATE_FRACTION = 0.7

/** Hard per-axis cap — allows stronger scatter than CELL_PAD alone. */
export const TRANSLATE_MAX_OFFSET_PX = 28

export function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

export function hashStringToInt(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function getTranslateMaxOffset(cellPad: number = CELL_PAD): number {
  return Math.max(cellPad * TRANSLATE_FRACTION, TRANSLATE_MAX_OFFSET_PX)
}

export function getTranslateOffset(
  artworkId: string | number,
  cellPad: number = CELL_PAD,
): { x: number; y: number } {
  const seed = hashStringToInt(String(artworkId))
  const rx = seededRandom(seed)
  const ry = seededRandom(seed + 7)
  const maxOffset = getTranslateMaxOffset(cellPad)

  return {
    x: (rx - 0.5) * 2 * maxOffset,
    y: (ry - 0.5) * 2 * maxOffset,
  }
}
