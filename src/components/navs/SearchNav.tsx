'use client'

import Link from 'next/link'

import useWindowSize from '@/hooks/useWindowSize'
import { useArtworks } from '@/providers/ArtworkProvider'
import { CloseSvg } from '@/components/icons'

export default function SearchNav() {
  const [state, setState] = useArtworks()
  const size = useWindowSize()

  return (
    <div
      className={`fixed right-[3.625rem] z-nav w-[16rem] bg-surface-nav p-space-3 transition-transform duration-300 ${
        state.searchNavOpen ? 'translate-x-0' : 'translate-x-[120%]'
      }`}
      style={{
        display: state.showSlideshow ? 'none' : '',
        top: size.width && size.width < 768 ? 9 : state.artworkViewTimeline ? 135 : 9,
      }}
    >
      <input
        type="text"
        className="w-full border border-ui-line bg-surface-page px-space-3 py-space-2 font-heading text-sm text-dark outline-none"
        placeholder="search artwork"
        value={state.searchValue}
        onChange={(e) => setState((prev) => ({ ...prev, searchValue: e.target.value }))}
      />
      <button
        className="absolute right-space-2 top-space-2 h-6 w-6 bg-transparent p-0 text-dark"
        onClick={() => setState((prev) => ({ ...prev, searchValue: '', searchNavOpen: false }))}
      >
        <CloseSvg />
      </button>

      <div
        className="absolute right-0 top-6 w-[16rem] overflow-y-auto bg-surface-nav"
        style={{
          maxHeight:
            size.width && size.height && size.width < 768
              ? (size.height || 400) - 24
              : state.artworkViewTimeline
                ? (size.height || 400) - 145
                : (size.height || 400) - 24,
        }}
      >
        <div className="px-space-2 pb-space-4 pt-space-3">
          {state.searchValue.trim() !== '' &&
            Object.keys(state.searchMatches).length > 0 &&
            state.filtered.map(
              (artwork) =>
                artwork.id &&
                state.searchMatches[String(artwork.id)] && (
                  <Link
                    href={`/${artwork.slug}`}
                    key={artwork.id}
                    className="mb-space-3 block no-underline"
                    onClick={() => setState((prev) => ({ ...prev, searchNavOpen: false }))}
                  >
                    <h3 className="font-heading text-[0.9375rem] text-dark">{artwork.title}</h3>
                    <p className="font-heading text-xs text-secondary">
                      Matched on: {state.searchMatches[String(artwork.id)]?.join(', ')}
                    </p>
                  </Link>
                ),
            )}
        </div>
      </div>
    </div>
  )
}
