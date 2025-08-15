/**
 * Detect whether we're running inside a Tauri WebView.
 */
export function isTauriEnvironment(): boolean {
  return typeof window !== "undefined" && Boolean((window as any).__TAURI__);
}

// backwards-compatibility – keep the old name too
export const isTauri = isTauriEnvironment;
