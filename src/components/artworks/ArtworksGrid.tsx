'use client'

import Masonry from 'react-masonry-css'

import ArtworkGridImage from '@/components/artworks/ArtworkGridImage'
import { getGridItemContainerSize } from '@/helpers/getGridItemContainerSize'
import { useArtworks } from '@/providers/ArtworkProvider'

const BREAKPOINT_COL_COUNTS = {
  default: 5,
  1200: 4,
  980: 3,
  768: 2,
  550: 1,
}

export default function ArtworksGrid() {
  const [state] = useArtworks()
  const itemSize = getGridItemContainerSize(state.viewportWidth)

  const calculateItemSize = {
    width: itemSize.width,
    height: 0,
    gap: itemSize.gap,
  }

  return (
    <Masonry
      breakpointCols={BREAKPOINT_COL_COUNTS}
      className="artwork-grid__container"
      columnClassName="artwork-grid__column"
      role="region"
      aria-label="Scrollable artwork grid"
    >
      {state.filtered.map((artwork) => (
        <div key={artwork.id}>
          <ArtworkGridImage artwork={artwork} itemSize={calculateItemSize} />
        </div>
      ))}
    </Masonry>
  )
}
