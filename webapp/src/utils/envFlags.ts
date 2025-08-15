/**
 * Environment-based feature flags
 */

export const USE_FIREHOSE_ONLY = 
  import.meta.env.VITE_USE_FIREHOSE_ONLY === 'true';

export const USE_CANONICAL_STORE = 
  import.meta.env.VITE_CANONICAL_STORE === '1';

// Add other feature flags here as needed
export const DEBUG_SSE_EVENTS = 
  import.meta.env.VITE_DEBUG_SSE_EVENTS === 'true';