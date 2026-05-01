// Define the breakpoints and column/gap values from your SCSS
const BREAKPOINTS = {
    s: 550,
    m: 767,
    l: 979,
    xl: 1200,
};

const GRID_SETTINGS = [
    { minWidth: BREAKPOINTS.xl, columns: 5, gap: 13 },
    { minWidth: BREAKPOINTS.l, columns: 4, gap: 11 },
    { minWidth: BREAKPOINTS.m, columns: 3, gap: 9 },
    { minWidth: BREAKPOINTS.s, columns: 2, gap: 7 },
    { minWidth: 0, columns: 1, gap: 5 }, // Default
];

const MAX_GRID_WIDTH = 1500; // From your SCSS

/**
 * Calculates the width and height for a square grid item container
 * based on the window width and fixed grid structure, and returns the gap.
 * @param windowWidth The current window width from useWindowSize.
 * @returns The calculated size (width and height) for the square container AND the gap size.
 */
export const getGridItemContainerSize = (windowWidth: number | undefined): { width: number, height: number, gap: number } => {
    if (windowWidth === undefined) {
        return { width: 300, height: 300, gap: 5 }; // Fallback size and gap
    }

    let columns = 1;
    let gap = 5;

    // Determine the current grid settings (columns and gap)
    for (const setting of GRID_SETTINGS) {
        if (windowWidth >= setting.minWidth) {
            columns = setting.columns;
            gap = setting.gap;
            break;
        }
    }

    // 1. Determine the effective width of the overall grid element (including padding).
    // Use Math.min to respect the 1500px max width.
    const effectiveGridElementWidth = Math.min(windowWidth, MAX_GRID_WIDTH);
    
    // 2. Calculate the total padding applied (gap on the left + gap on the right).
    const totalPadding = 2 * gap;

    // 3. Calculate the actual width AVAILABLE for columns and internal gaps.
    // This is the interior space of the container.
    const availableInteriorWidth = effectiveGridElementWidth - totalPadding;

    // 4. Calculate the total space taken up by INTERNAL gaps (between columns).
    const totalInternalGapSpace = (columns - 1) * gap;

    // 5. Calculate the total space available for the column content.
    const availableColumnSpace = availableInteriorWidth - totalInternalGapSpace;

    // 6. Calculate the width of a single column (the item width).
    const itemWidth = Math.floor(availableColumnSpace / columns);
    
    const itemHeight = itemWidth;

    return {
        width: itemWidth,
        height: itemHeight,
        gap: gap
    };
};