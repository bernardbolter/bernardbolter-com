'use client'

import Link from 'next/link'

import { CloseSvg } from '@/components/icons'
import { closeSearchNavState } from '@/helpers/navSearch'
import { getSearchDrawerTop } from '@/helpers/navLayout'
import useWindowSize from '@/hooks/useWindowSize'
import { useArtworks } from '@/providers/ArtworkProvider'

export default function SearchNav() {
  const [state, setState] = useArtworks()
  const size = useWindowSize()

  const drawerTop = getSearchDrawerTop(state, size)

  return (
    <div
      className={
        state.searchNavOpen
          ? 'search-nav__container search-nav__container--open'
          : 'search-nav__container'
      }
      style={{
        display: state.showSlideshow ? 'none' : undefined,
        top: drawerTop,
      }}
    >
      <input
        type="text"
        className="search-nav__input"
        placeholder="search artwork"
        value={state.searchValue}
        onChange={(e) => setState((prev) => ({ ...prev, searchValue: e.target.value }))}
      />
      <div
        className="search-nav__close"
        onClick={() => setState((prev) => closeSearchNavState(prev))}
        role="button"
        tabIndex={0}
      >
        <CloseSvg />
      </div>
      <div
        className="search-nav__matched-container"
        style={{
          top: 27,
          right: 0,
          maxHeight:
            size.width && size.height && size.width < 768
              ? (size.height || 400) - 24
              : state.artworkViewTimeline
                ? (size.height || 400) - 145
                : (size.height || 400) - 24,
        }}
      >
        <div
          className="search-nav__matched-inner"
          tabIndex={0}
          aria-live="polite"
          style={{
            padding: Object.values(state.searchMatches).length === 0 ? '0' : '10px 5px 15px',
          }}
        >
          {state.searchValue.trim() !== '' &&
            Object.keys(state.searchMatches).length > 0 &&
            state.filtered.map(
              (artwork) =>
                artwork.id &&
                state.searchMatches[String(artwork.id)] && (
                  <Link
                    href={`/${artwork.slug}`}
                    key={artwork.id}
                    className="search-nav__matched-item"
                    onClick={() => setState((prev) => ({ ...prev, searchNavOpen: false }))}
                  >
                    <h3>{artwork.title}</h3>
                    <p>Matched on: {state.searchMatches[String(artwork.id)]?.join(', ')}</p>
                  </Link>
                ),
            )}
        </div>
      </div>
    </div>
  )
}
