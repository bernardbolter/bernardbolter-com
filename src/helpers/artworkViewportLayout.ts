/** Desktop defaults for SSR / first paint before `window` is available. */
export const SSR_DEFAULT_VIEWPORT = {
  width: 1440,
  height: 900,
} as const

export type ArtworkViewportLayout = {
  viewportWidth: number
  viewportHeight: number
  artworkContainerWidth: number
  artworkContainerHeight: number
  artworkDesktopSideWidth: number
}

/** Match `ArtworksProvider` resize logic — shared for SSR initial state. */
export function getArtworkViewportLayout(
  viewportWidth: number,
  viewportHeight: number,
): ArtworkViewportLayout {
  const isDesktop = viewportWidth >= 768
  const artworkContainerSize = isDesktop
    ? Math.max(1, viewportHeight - 125)
    : Math.max(1, viewportWidth - 50)

  return {
    viewportWidth,
    viewportHeight,
    artworkContainerWidth: artworkContainerSize,
    artworkContainerHeight: artworkContainerSize,
    artworkDesktopSideWidth: isDesktop
      ? Math.max(0, (viewportWidth - artworkContainerSize) / 2)
      : 0,
  }
}

export function getSsrArtworkViewportLayout(): ArtworkViewportLayout {
  return getArtworkViewportLayout(SSR_DEFAULT_VIEWPORT.width, SSR_DEFAULT_VIEWPORT.height)
}
