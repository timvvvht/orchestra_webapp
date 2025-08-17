/**
 * Hook to detect user's motion preferences
 * @returns boolean - true if user prefers reduced motion
 */
export const useReducedMotion = () =>
  matchMedia('(prefers-reduced-motion: reduce)').matches;