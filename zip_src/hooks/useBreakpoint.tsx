import { useState, useEffect } from 'react';

/**
 * Hook to detect responsive breakpoints
 * @param minPx - Minimum pixel width for desktop (default: 768px)
 * @returns boolean - true for desktop (>=768px), false for mobile/tablet
 */
export function useBreakpoint(minPx = 768) {
  const query = `(min-width:${minPx}px)`;
  const [desktop, setDesktop] = useState(() => matchMedia(query).matches);
  
  useEffect(() => {
    const mql = matchMedia(query);
    const cb = () => setDesktop(mql.matches);
    mql.addEventListener('change', cb);
    return () => mql.removeEventListener('change', cb);
  }, [query]);
  
  return desktop; // true = desktop, false = mobile/tablet
}