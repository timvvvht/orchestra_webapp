/**
 * Tauri API wrapper with browser fallbacks
 * Provides safe access to Tauri APIs with graceful degradation for web mode
 */

import { isTauri } from './environment';

// Type definitions for common Tauri operations
export interface TauriInvokeResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Safe wrapper for Tauri invoke command
 * Returns null in web mode, actual result in Tauri mode
 */
export async function safeTauriInvoke<T = any>(
  command: string,
  args?: any
): Promise<TauriInvokeResult<T>> {
  if (!isTauri()) {
    console.warn(`[Web Mode] Tauri command '${command}' called in browser - providing fallback`);
    return {
      success: false,
      error: 'Tauri not available in web mode'
    };
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const result = await invoke<T>(command, args);
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error(`[Tauri] Error invoking command '${command}':`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Safe wrapper for Tauri event listening
 * Returns no-op function in web mode
 */
export async function safeTauriListen(
  event: string,
  handler: (event: any) => void
): Promise<() => void> {
  if (!isTauri()) {
    console.warn(`[Web Mode] Tauri event listener '${event}' called in browser - providing no-op`);
    return () => {}; // Return no-op unlisten function
  }

  try {
    const { listen } = await import('@tauri-apps/api/event');
    const unlisten = await listen(event, handler);
    return unlisten;
  } catch (error) {
    console.error(`[Tauri] Error setting up event listener for '${event}':`, error);
    return () => {};
  }
}

/**
 * Safe wrapper for Tauri file operations
 */
export async function safeTauriReadFile(path: string): Promise<TauriInvokeResult<string>> {
  if (!isTauri()) {
    console.warn(`[Web Mode] Tauri file read '${path}' called in browser - not supported`);
    return {
      success: false,
      error: 'File operations not available in web mode'
    };
  }

  try {
    const { readTextFile } = await import('@tauri-apps/plugin-fs');
    const content = await readTextFile(path);
    return {
      success: true,
      data: content
    };
  } catch (error) {
    console.error(`[Tauri] Error reading file '${path}':`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Safe wrapper for Tauri window operations
 */
export async function safeTauriWindowOperation<T = any>(
  operation: string,
  ...args: any[]
): Promise<TauriInvokeResult<T>> {
  if (!isTauri()) {
    console.warn(`[Web Mode] Tauri window operation '${operation}' called in browser - not supported`);
    return {
      success: false,
      error: 'Window operations not available in web mode'
    };
  }

  try {
    const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
    const window = getCurrentWebviewWindow();
    
    if (typeof window[operation] === 'function') {
      const result = await window[operation](...args);
      return {
        success: true,
        data: result
      };
    } else {
      throw new Error(`Window operation '${operation}' not found`);
    }
  } catch (error) {
    console.error(`[Tauri] Error with window operation '${operation}':`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check if specific Tauri features are available
 */
export const tauriFeatures = {
  invoke: () => isTauri(),
  events: () => isTauri(),
  filesystem: () => isTauri(),
  window: () => isTauri(),
  notifications: () => isTauri(),
  clipboard: () => isTauri(),
};

/**
 * Get platform-specific capabilities
 */
export const getCapabilities = () => {
  return {
    platform: isTauri() ? 'tauri' : 'web',
    fileSystem: tauriFeatures.filesystem(),
    nativeNotifications: tauriFeatures.notifications(),
    windowControls: tauriFeatures.window(),
    systemClipboard: tauriFeatures.clipboard(),
    backgroundProcesses: tauriFeatures.invoke(),
  };
};
