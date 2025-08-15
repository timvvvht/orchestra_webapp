/**
 * Debug flag utilities for development features
 */

export function isDebug(): boolean {
  // Check for debug query parameter
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('debug')) return true;
  
  // Check for development environment
  if (import.meta.env.DEV) return true;
  
  // Check for specific debug flag
  if (import.meta.env.VITE_DEBUG_NATIVE_TOOLS === 'true') return true;
  
  return false;
}

export function isDebugFeature(feature: string): boolean {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.has('debug') || urlParams.has(`debug-${feature}`);
}