import { useState, useEffect } from 'react';

/**
 * Custom hook to detect mobile, tablet, and small-phone viewports.
 * Uses matchMedia for optimal performance without unnecessary re-renders.
 */
export function useIsMobile(breakpoint = 1024) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < breakpoint;
  });

  const [isSmallPhone, setIsSmallPhone] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 375;
  });

  const [isTablet, setIsTablet] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 768 && window.innerWidth < 1024;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < breakpoint);
      setIsSmallPhone(width < 375);
      setIsTablet(width >= 768 && width < 1024);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return { isMobile, isSmallPhone, isTablet };
}

export default useIsMobile;

