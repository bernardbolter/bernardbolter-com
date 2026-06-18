import type { ArtworksState } from '@/types/frontend'

type ViewportSize = {
  width?: number
  height?: number
}

/** Matches `Nav` container `top` — keep filter/search drawers aligned with their buttons. */
export function getNavContainerTop(
  state: Pick<ArtworksState, 'artworkViewTimeline' | 'showSlideshow'>,
  size: ViewportSize,
): number {
  if (!state.artworkViewTimeline || state.showSlideshow) return 4
  if (size.width && size.width > 768) return 130
  return 4
}

/** Align nav drawers with the chamfered face on the button, not the SVG top edge. */
export const NAV_DRAWER_FACE_OFFSET_PX = 6

/** Vertical offset for a nav icon by stack index (0 = filter, 1 = search, …). */
export function getNavButtonTop(
  state: Pick<ArtworksState, 'artworkViewTimeline' | 'showSlideshow'>,
  size: ViewportSize,
  stackIndex: number,
): number {
  return getNavContainerTop(state, size) + stackIndex * 34
}

/** Filter drawer `top` — button row + chamfer alignment offset. */
export function getFilterDrawerTop(
  state: Pick<ArtworksState, 'artworkViewTimeline' | 'showSlideshow'>,
  size: ViewportSize,
): number {
  return getNavButtonTop(state, size, 0) + NAV_DRAWER_FACE_OFFSET_PX
}

/** Search drawer `top` — second button row + chamfer alignment offset. */
export function getSearchDrawerTop(
  state: Pick<ArtworksState, 'artworkViewTimeline' | 'showSlideshow'>,
  size: ViewportSize,
): number {
  return getNavButtonTop(state, size, 1) + NAV_DRAWER_FACE_OFFSET_PX
}
