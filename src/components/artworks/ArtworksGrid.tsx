'use client'

import Link from 'next/link'
import Masonry from 'react-masonry-css'

import ArtworkImage from '@/components/artworks/ArtworkImage'
import { useArtworks } from '@/providers/ArtworkProvider'
import { getGridItemContainerSize } from '@/helpers/getGridItemContainerSize'
import { getSeriesColor } from '@/helpers/seriesColor'
import { resolveSeriesSlug } from '@/helpers/artworkCatalog'

const BREAKPOINT_COL_COUNTS = {
  default: 5,
  1200: 4,
  979: 3,
  768: 2,
  550: 1,
}

export default function ArtworksGrid() {
  const [state] = useArtworks()
  const itemSize = getGridItemContainerSize(state.viewportWidth)

  return (
    <div className="mx-auto w-full max-w-grid px-[0.3125rem] s:px-[0.4375rem] m:px-[0.5625rem] l:px-[0.6875rem] xl:px-[0.8125rem]">
      <Masonry
        breakpointCols={BREAKPOINT_COL_COUNTS}
        className="bb-masonry-grid flex w-auto"
        columnClassName="bb-masonry-grid-column bg-clip-padding pl-[0.3125rem] s:pl-[0.4375rem] m:pl-[0.5625rem] l:pl-[0.6875rem] xl:pl-[0.8125rem]"
      >
        {state.filtered.map((artwork) => {
          const seriesSlug = resolveSeriesSlug(artwork) ?? ''
          return (
            <div key={artwork.id} className="pb-[0.3125rem] s:pb-[0.4375rem] m:pb-[0.5625rem] l:pb-[0.6875rem] xl:pb-[0.8125rem]">
              <Link
                href={`/${artwork.slug}`}
                className="block w-full pb-[3.0625rem] no-underline"
                style={{ width: itemSize.width }}
              >
                <div className="relative mx-auto" style={{ width: itemSize.width }}>
                  <ArtworkImage
                    artwork={artwork}
                    artworkContainerWidth={itemSize.width}
                    artworkContainerHeight={5000}
                    useImageFactors
                  />
                  <div className="absolute bottom-[-2.75rem] left-0 right-0 flex items-center gap-space-2">
                    <div
                      className="h-[0.625rem] w-[0.625rem]"
                      style={{ backgroundColor: getSeriesColor(seriesSlug) }}
                    />
                    <h3 className="truncate font-heading text-sm text-dark">{artwork.title}</h3>
                  </div>
                </div>
              </Link>
            </div>
          )
        })}
      </Masonry>
    </div>
  )
}
