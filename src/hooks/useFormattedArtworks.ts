import { useEffect, useMemo } from 'react';
import { useArtworks } from '@/providers/ArtworkProvider';
import useWindowSize from '@/hooks/useWindowSize';
import { generateTimeline } from '@/helpers/timeline';
import { SortingType } from '@/types/timlineTypes';

export function useFormattedArtworks(
  artworkContainerWidth: number,
  artworkContainerHeight: number,
  artworkDesktopSideWidth: number
) {
  const [artworks, setArtworks] = useArtworks();
  const vport = useWindowSize();

  const formattedArtworks = useMemo(() => {
    return generateTimeline({
      artworks: artworks.filtered,
      sorting: artworks.sorting as SortingType,
      artworkContainerWidth,
      artworkContainerHeight,
      desktopSideWidth: artworkDesktopSideWidth,
      viewportWidth: vport.width || 0,
      viewportHeight: vport.height || 0
    });
  }, [
    artworks.filtered,
    artworks.sorting,
    artworkContainerWidth,
    artworkContainerHeight,
    artworkDesktopSideWidth,
    vport.width,
    vport.height
  ]);

  // Update context with formatted artworks
  useEffect(() => {
    setArtworks(prev => ({
      ...prev,
      formattedArtworks
    }));
  }, [formattedArtworks, setArtworks]);

  // Reset currentArtworkIndex if it's out of bounds
  useEffect(() => {
    if (formattedArtworks.artworksArray.length > 0 && 
        artworks.currentArtworkIndex >= formattedArtworks.artworksArray.length) {
      setArtworks(prev => ({
        ...prev,
        currentArtworkIndex: 0
      }));
    }
  }, [formattedArtworks.artworksArray.length, artworks.currentArtworkIndex, setArtworks]);

  return formattedArtworks;
}