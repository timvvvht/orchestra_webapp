// Simple in-memory buffer; no imports required
type HydroStage = 'DB' | 'PARSED' | 'STORE' | 'CHAT' | 'TL';
interface HydroEntry { stage: HydroStage; payload: any; ts: number; }

declare global {
  interface Window { __HYDRO_DEBUG?: HydroEntry[]; }
}

export const pushHydro = (stage: HydroStage, payload: any) => {
  if (typeof window === 'undefined') return;
  if (!window.__HYDRO_DEBUG) window.__HYDRO_DEBUG = [];
  window.__HYDRO_DEBUG.push({ stage, payload, ts: Date.now() });
  // keep latest 500
  if (window.__HYDRO_DEBUG.length > 500) window.__HYDRO_DEBUG.shift();
};

// Stable empty array to prevent infinite re-renders
const EMPTY_ARRAY: HydroEntry[] = [];

export const useHydroDebug = (): HydroEntry[] =>
  typeof window !== 'undefined' ? (window.__HYDRO_DEBUG || EMPTY_ARRAY) : EMPTY_ARRAY;