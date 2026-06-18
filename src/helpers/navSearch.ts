import type { ArtworksState } from '@/types/frontend'

/** Same reset as SearchNav manual close — clears term and closes drawer. */
export function closeSearchNavState(prev: ArtworksState): ArtworksState {
  return {
    ...prev,
    searchValue: '',
    searchNavOpen: false,
  }
}
