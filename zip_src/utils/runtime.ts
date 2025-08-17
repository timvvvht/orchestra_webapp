/**
 * Runtime environment detection utilities
 * Provides helpers to detect the current runtime environment (Tauri vs web)
 */

/**
 * Check if the application is running in a Tauri environment
 * @returns true if running in Tauri, false if running in web browser
 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && !!(window as any).__TAURI__;
}