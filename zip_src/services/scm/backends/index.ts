/**
 * SCM Backends - Export all available backend implementations
 */

export type { ScmBackend } from './ScmBackend';
export { RustTauriBackend } from './RustTauriBackend';
export { MockBackend } from './MockBackend';
// Note: SimpleNodeJsBackend moved to deprecated/ and removed from exports
// Note: NodeJsBackend removed due to missing dependencies (../git, ../repository)

/**
 * Utility function to detect if we're in a Tauri environment
 * Uses multiple detection methods for reliability
 */
export function isTauriEnvironment(): boolean {
  // ① Build-time env (set by vite-plugin-tauri or vite-plugin-svelte-tauri)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (import.meta.env.TAURI_DEBUG !== undefined) return true;
    if (import.meta.env.TAURI_PLATFORM) return true;
  }
  // ② Global injected by @tauri-apps/api/core when it's been imported once
  if (typeof window !== 'undefined' && (window as any).__TAURI__) return true;
  return false;
}
