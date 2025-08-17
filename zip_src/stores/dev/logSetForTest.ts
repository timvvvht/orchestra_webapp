/**
 * Test-only Zustand middleware that logs every setState call
 * to globalThis.__ZUSTAND_SET_LOG__ for debugging infinite loops
 */

export const logSetForTest =
  (label = 'Store') =>
  (config: any) =>
    (set: any, get: any, api: any) =>
      config(
        (partial: any, replace?: boolean) => {
          if (process.env.NODE_ENV === 'test') {
            // Initialize global log array if not exists
            if (!globalThis.__ZUSTAND_SET_LOG__) {
              globalThis.__ZUSTAND_SET_LOG__ = [];
            }
            
            // Log the setState call with timestamp and stack trace
            const logEntry = {
              label,
              partial,
              replace,
              timestamp: Date.now(),
              stack: new Error().stack?.split('\n').slice(1, 6) // First 5 stack frames
            };
            
            globalThis.__ZUSTAND_SET_LOG__.push(logEntry);
            
            // Also console.debug for immediate visibility during test runs
            console.debug(`[${label}] setState called:`, { partial, replace });
          }
          
          return set(partial, replace);
        },
        get,
        api,
      );

// Type declaration for global
declare global {
  var __ZUSTAND_SET_LOG__: Array<{
    label: string;
    partial: any;
    replace?: boolean;
    timestamp: number;
    stack?: string[];
  }>;
}