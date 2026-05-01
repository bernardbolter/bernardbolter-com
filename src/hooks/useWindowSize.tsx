import { useState, useEffect, useCallback } from 'react';

interface WindowSize {
  width: number | undefined;
  height: number | undefined;
}

function useWindowSize(): WindowSize {
  const [windowSize, setWindowSize] = useState<WindowSize>({
    width: undefined,
    height: undefined,
  });

  const handleSize = useCallback(() => {
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }, []);


  useEffect(() => {
    // only execute all the code below in client side
    if (typeof window !== 'undefined') {
        // Handler to call on window resize
        window.addEventListener("resize", handleSize);

        // Call handler right away so state gets updated with initial window size
        handleSize();

        // Remove event listener on cleanup
        return () => window.removeEventListener("resize", handleSize);
    }
  }, [handleSize]); // Empty array ensures that effect is only run on mount and unmount

  return windowSize;
}

export default useWindowSize;