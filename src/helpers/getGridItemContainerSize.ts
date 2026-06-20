/** Matches Tailwind screens in tailwind.config.js and design-system.md §4 */
const BREAKPOINTS = {
  s: 550,
  m: 768,
  l: 979,
  xl: 1200,
}

const GRID_SETTINGS = [
  { minWidth: BREAKPOINTS.xl, columns: 5, gap: 13 },
  { minWidth: BREAKPOINTS.l, columns: 4, gap: 11 },
  { minWidth: BREAKPOINTS.m, columns: 3, gap: 9 },
  { minWidth: BREAKPOINTS.s, columns: 2, gap: 7 },
  { minWidth: 0, columns: 1, gap: 5 },
]

const MAX_GRID_WIDTH = 1500

/** 1.5rem existing + space-9 (1.5rem) per grid-return-to-column-span-spec §4 */
export const GRID_SIDE_PADDING_PX = 48

export function getGridItemContainerSize(windowWidth: number | undefined): {
  width: number
  height: number
  gap: number
  columns: number
} {
  if (windowWidth === undefined || windowWidth <= 0) {
    return { width: 300, height: 300, gap: 5, columns: 1 }
  }

  let columns = 1
  let gap = 5

  for (const setting of GRID_SETTINGS) {
    if (windowWidth >= setting.minWidth) {
      columns = setting.columns
      gap = setting.gap
      break
    }
  }

  const effectiveGridElementWidth = Math.min(windowWidth, MAX_GRID_WIDTH)
  const availableInteriorWidth = effectiveGridElementWidth - GRID_SIDE_PADDING_PX * 2
  const totalInternalGapSpace = (columns - 1) * gap
  const availableColumnSpace = availableInteriorWidth - totalInternalGapSpace
  const itemWidth = Math.floor(availableColumnSpace / columns)

  return {
    width: itemWidth,
    height: itemWidth,
    gap,
    columns,
  }
}
