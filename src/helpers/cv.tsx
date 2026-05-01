interface CvNode {
    __typename: string;
    city: string | null;
    gallery: string | null;
    role: string | null;
    school: string | null;
    // FIX: Updated type to string[] as the data comes in as an array with one value.
    section: string[]; 
    title: string | null;
    year: number | null;
}

// Define the structure of the output (grouped data)
interface GroupedCvNodes {
    [section: string]: CvNode[]; // Key is the section (string), value is an array of nodes
}

/**
 * Groups CV nodes by their 'section' key and sorts the items within each section
 * from latest year to oldest year (descending order).
 * * @param nodes - The array of CvNode objects (passed directly from the provider).
 * @returns A new object with keys corresponding to the section names, 
 * and values being an array of CvNode objects belonging to that section, sorted by year.
 */
export const groupCvNodesBySection = (nodes: CvNode[]): GroupedCvNodes => {
    
    if (!Array.isArray(nodes)) {
        console.error("groupCvNodesBySection received invalid input: not an array.");
        return {};
    }

    // 1. Group the nodes by section
    const grouped = nodes.reduce((acc: GroupedCvNodes, node: CvNode) => {
        // FIX: Safely access the first element of the section array and convert it to uppercase.
        const sectionKey = Array.isArray(node.section) 
            ? node.section[0]?.toUpperCase() 
            : null; 
        
        if (typeof sectionKey === 'string' && sectionKey.length > 0) {
            if (!acc[sectionKey]) {
                acc[sectionKey] = [];
            }
            acc[sectionKey].push(node);
        } else {
            console.warn("Node found with a missing or invalid 'section' key, skipping:", node);
        }

        return acc;
    }, {});

    // 2. Sort the nodes within each section
    for (const sectionKey in grouped) {
        if (Object.hasOwnProperty.call(grouped, sectionKey)) {
            // Sort the array: b.year - a.year results in descending order (Latest to Oldest)
            grouped[sectionKey].sort((a, b) => {
                // Handle null/undefined years by treating them as 0 for sorting,
                // or you might place null years at the end by returning a negative/positive number.
                const yearA = a.year ?? 0;
                const yearB = b.year ?? 0;
                
                // Descending sort (latest first)
                return yearB - yearA;
            });
        }
    }

    return grouped;
};