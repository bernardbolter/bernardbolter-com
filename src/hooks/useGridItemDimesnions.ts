// hooks/useGridItemDimensions.ts

import { useMemo } from 'react';
import { Artwork } from '@/types/artworkTypes';

interface Dimensions {
    displayWidth: number;
    displayHeight: number;
}

interface UseGridItemDimensionsProps {
    artwork: Artwork;
    /** The calculated width of a single grid column, derived from the main ArtworksGrid component. */
    columnWidth: number;
}

/**
 * Custom hook to calculate the display width and height of an artwork image 
 * within a Masonry grid column.
 * We only constrain the width, allowing the height to be determined by the image's aspect ratio.
 */
export const useGridItemDimensions = ({
    artwork,
    columnWidth,
}: UseGridItemDimensionsProps): Dimensions => {

    return useMemo(() => {
        const imageNode = artwork.artworkFields?.artworkImage?.node || artwork.artworkFields?.videoPoster?.node;
        
        // Fallback to a square if dimension metadata is missing
        const originalWidth = imageNode?.mediaDetails?.width || 1; 
        const originalHeight = imageNode?.mediaDetails?.height || 1;

        // Calculate the aspect ratio
        const aspectRatio = originalWidth / originalHeight;

        // The image must fit the width of its grid column
        const displayWidth = columnWidth;
        
        // The height is determined by the aspect ratio and the calculated displayWidth
        const displayHeight = displayWidth / aspectRatio;
        
        // Return dimensions as integers
        return { 
            displayWidth: Math.round(displayWidth), 
            displayHeight: Math.round(displayHeight) 
        };
    }, [
        columnWidth,
        artwork.artworkFields?.artworkImage?.node,
        artwork.artworkFields?.videoPoster?.node
    ]);
};