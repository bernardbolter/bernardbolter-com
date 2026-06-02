'use client'

import { useState, createContext, useContext, ReactNode } from 'react'

import { artworkHasDisplayImage } from '@/helpers/artworkCatalog'
import {
  createInitialArtworksState,
  type ArtistInfoData,
  type ArtworksContextType,
  type ArtworksState,
  type CatalogueArtwork,
} from '@/types/frontend'

const ArtworksContext = createContext<ArtworksContextType>([
  createInitialArtworksState([]),
  () => {},
])

interface ArtworksProviderProps {
  children: ReactNode
  artworks: CatalogueArtwork[]
  artist: ArtistInfoData
}

export const ArtworksProvider = ({ children, artworks, artist }: ArtworksProviderProps) => {
  const catalogue = artworks ?? []
  const artworksWithImages = catalogue.filter(artworkHasDisplayImage)

  const [state, setState] = useState<ArtworksState>(() => ({
    ...createInitialArtworksState(artworksWithImages, artist),
    totalCount: catalogue.length,
    withImagesCount: artworksWithImages.length,
  }))

  return <ArtworksContext.Provider value={[state, setState]}>{children}</ArtworksContext.Provider>
}

export function useArtworks() {
  const context = useContext(ArtworksContext)
  if (!context) {
    throw new Error('useArtworks must be used within ArtworksProvider')
  }
  return context
}

export default ArtworksProvider

// "use client"

// import { useState, useEffect, createContext, useContext, ReactNode, useMemo, Dispatch, SetStateAction } from 'react'
// import { Artwork } from '@/types/artworkTypes'
// import { ArtworksState, AllData, ArtistData } from '@/types/artworkProviderTypes'
// import { SortingType } from '@/types/timlineTypes'
// import { generateTimeline } from '@/helpers/timeline'

// const DEFAULT_ARTIST_INFO: ArtistData = {
//     birthcity: undefined,
//     birthyear: undefined,
//     link1: undefined,
//     link2: undefined,
//     link3: undefined,
//     link4: undefined,
//     link5: undefined,
//     name: undefined,
//     workcity1: undefined,
//     workcity2: undefined,
//     workcity3: undefined,
// };

// type ArtworksContextType = [ArtworksState, Dispatch<SetStateAction<ArtworksState>>]

// const ArtworksContext = createContext<ArtworksContextType>([
//   {
//     original: [],
//     filtered: [],
//     formattedArtworks: null,
//     currentArtworkIndex: 0,
//     sorting: "latest",
//     artworkViewTimeline: true,
//     filtersArray: [],
//     isAvailableFilter: false,
//     filterNavOpen: false,
//     searchNavOpen: false,
//     showSlideshow: false,
//     slideshowPlaying: false,
//     slideshowTimerProgress: 0,
//     isTimelineScrollingProgamatically: false,
//     searchValue: "",
//     searchMatches: {},
//     infoOpen: false,
//     cvData: [],
//     bioData: null,
//     statementData: null,
//     contactData: null,
//     datenschutzData: null,
//     artistData: DEFAULT_ARTIST_INFO,
//     viewportWidth: 0 as number,
//     viewportHeight: 0 as number,
//     artworkContainerWidth: 0 as number,
//     artworkContainerHeight: 0 as number,
//     artworkDesktopSideWidth: 0 as number,
//     savedTimelineIndex: 0 as number,
//     savedTimelineFiltersHash: "" as string,
//   },
//   () => {}
// ])

// interface ArtworksProviderProps {
//   children: ReactNode;
//   allData: AllData;
// }

// export const ArtworksProvider = ({ children, allData }: ArtworksProviderProps) => {

//   // console.log(allData)

//   const originalArtworks = allData.allArtwork.nodes.filter(artwork => {
//       return !!artwork.artworkFields?.artworkImage || !!artwork.artworkFields?.videoPoster;
//   });

//   const [state, setState] = useState<ArtworksState>({
//         original: originalArtworks,
//         filtered: originalArtworks,
//         formattedArtworks: null,
//         currentArtworkIndex: 0,
//         sorting: "latest",
//         artworkViewTimeline: true,
//         filtersArray: [],
//         isAvailableFilter: false,
//         filterNavOpen: false,
//         searchNavOpen: false,
//         showSlideshow: false,
//         slideshowPlaying: false,
//         slideshowTimerProgress: 0,
//         isTimelineScrollingProgamatically: false,
//         searchValue: "",
//         searchMatches: {},
//         infoOpen: false,
//         cvData: allData.cvinfos.nodes || [],
//         bioData: allData.biography || null,
//         statementData: allData.statement || null,
//         contactData: allData.contact || null,
//         datenschutzData: allData.datenschutz || null,
//         artistData: (allData.artistData || DEFAULT_ARTIST_INFO) as ArtistData,
//         viewportWidth: 0,
//         viewportHeight: 0,
//         artworkContainerWidth: 0,
//         artworkContainerHeight: 0,
//         artworkDesktopSideWidth: 0,
//         savedTimelineIndex: 0,
//         savedTimelineFiltersHash: "",
//   })

//   // Initialize original artwork on mount
//   useEffect(() => {
//     if (allData.allArtwork.nodes.length > 0 && state.original.length === 0) {
//       setState(prev => ({
//         ...prev,
//         original: allData.allArtwork.nodes,
//         filtered: allData.allArtwork.nodes,
//         cvData: allData.cvinfos.nodes,
//         bioData: allData.biography,
//         datenschutzData: allData.datenschutz,
//         artistData: allData.artistData || {},
//       }));
//     }
//   }, [allData, state.original.length]);

//   // Memoized filtered and sorted artwork
//   const filteredAndSorted = useMemo(() => {
//     if (state.original.length === 0) return []

//     // Filter out artworks without images
//     let result = state.original

//     // Aplly is Available filter
//     if (state.isAvailableFilter) {
//       result = result.filter(( artwork: Artwork) => {
//         console.log(artwork)
//         return artwork.artworkFields?.forsale === true
//       })
//     }

//     // Apply series filters
//      if (state.filtersArray.length > 0) {
//       result = result.filter((artwork: Artwork) => {
//         const series = artwork.artworkFields.series;
//         if (!series) {
//             return false;
//         }
//         return state.filtersArray.includes(series);

//       })
//     }

//     // Apply search filter
//     if (state.searchValue.trim()) {
//       const searchLower = state.searchValue.toLowerCase()
//       const matches: {  [key: string]: string[] } = {}
//       result = result.filter(artwork => {
//         const fields= [
//           { name: 'title', value: artwork.title},
//           { name: 'city', value: artwork.artworkFields?.city},
//           { name: 'county', value: artwork.artworkFields?.country},
//           { name: 'medium', value: artwork.artworkFields?.medium },
//           { name: 'style', value: artwork.artworkFields?.style},
//           { name: 'year', value: artwork.artworkFields?.year?.toString()}
//         ]
//         const matchedFields: string[] = []
//         const isMatch = fields.some(field => {
//           if (field.value && field.value.toLowerCase().includes(searchLower)) {
//             matchedFields.push(field.name)
//             return true
//           }
//           return false
//         })
//         if (isMatch && artwork.id) {
//           matches[artwork.id] = matchedFields
//         }
//         return isMatch
//       })
//       setState(state => ({ ...state, searchMatches: matches }))
//     } else {
//       setState(state => ({ ...state, searchMatches: {} }))
//     }

//     // Apply sorting
//     if (state.sorting === 'latest') {
//       result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
//     } else if (state.sorting === 'oldest') {
//       result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
//     } else if (state.sorting === 'random') {
//       result.sort(() => Math.random() - 0.5)
//     }

//     return result
//   }, [state.original, state.filtersArray, state.searchValue, state.sorting, state.isAvailableFilter])

//   // Update filtered array when computation changes
//   useEffect(() => {
//     setState(prev => ({ ...prev, filtered: filteredAndSorted }))
//   }, [filteredAndSorted])

//   // Create a hash of current filters/search/sort to detect changes
//   const currentFiltersHash = useMemo(() => {
//     return JSON.stringify({
//       filters: state.filtersArray.sort(),
//       search: state.searchValue,
//       sort: state.sorting
//     })
//   }, [state.filtersArray, state.searchValue, state.sorting])

//   // When filters/search/sort change, reset saved timeline position
//   useEffect(() => {
//     if (state.savedTimelineFiltersHash && state.savedTimelineFiltersHash !== currentFiltersHash) {
//       setState(prev => ({
//         ...prev,
//         savedTimelineIndex: 0,
//         savedTimelineFiltersHash: currentFiltersHash,
//         currentArtworkIndex: 0
//       }))
//     } else if (!state.savedTimelineFiltersHash) {
//       setState(prev => ({
//         ...prev,
//         savedTimelineFiltersHash: currentFiltersHash
//       }))
//     }
//   }, [currentFiltersHash, state.savedTimelineFiltersHash])

//   // Memoized formatted artworks - generated whenever dependencies change
//   const formattedArtworks = useMemo(() => {
//     // Don't generate if we don't have the necessary dimensions yet
//     if (
//       state.artworkContainerWidth === 0 ||
//       state.artworkContainerHeight === 0 ||
//       state.viewportWidth === 0 ||
//       state.viewportHeight === 0 ||
//       state.filtered.length === 0
//     ) {
//       return null;
//     }

//     return generateTimeline({
//       artworks: state.filtered,
//       sorting: state.sorting as SortingType,
//       artworkContainerWidth: state.artworkContainerWidth,
//       artworkContainerHeight: state.artworkContainerHeight,
//       desktopSideWidth: state.artworkDesktopSideWidth,
//       viewportWidth: state.viewportWidth,
//       viewportHeight: state.viewportHeight
//     });
//   }, [
//     state.filtered,
//     state.sorting,
//     state.artworkContainerWidth,
//     state.artworkContainerHeight,
//     state.artworkDesktopSideWidth,
//     state.viewportWidth,
//     state.viewportHeight
//   ])

//   // Update formattedArtworks in state when it changes
//   useEffect(() => {
//     setState(prev => ({ ...prev, formattedArtworks }))
//   }, [formattedArtworks])

//   return (
//     <ArtworksContext.Provider value={[state, setState]}>
//       {children}
//     </ArtworksContext.Provider>
//   )
// }

// export function useArtworks() {
//   const context = useContext(ArtworksContext)
//   if (!context) {
//     throw new Error('useArtworks must be used within ArtworksProvider')
//   }
//   return context
// }

// export default ArtworksProvider
