/**
 * Utilities for managing the current project path
 */

const PROJECT_PATH_KEY = 'orchestra_current_project';

/**
 * Set the current project path in localStorage
 */
export function setCurrentProjectPath(path: string): void {
  try {
    localStorage.setItem(PROJECT_PATH_KEY, path);
    console.log(`[ProjectPath] Set current project path: ${path}`);
  } catch (error) {
    console.warn('[ProjectPath] Failed to set project path:', error);
  }
}

/**
 * Get the current project path from localStorage
 */
export function getCurrentProjectPath(): string | null {
  try {
    return localStorage.getItem(PROJECT_PATH_KEY);
  } catch (error) {
    console.warn('[ProjectPath] Failed to get project path:', error);
    return null;
  }
}

/**
 * Clear the current project path
 */
export function clearCurrentProjectPath(): void {
  try {
    localStorage.removeItem(PROJECT_PATH_KEY);
    console.log('[ProjectPath] Cleared current project path');
  } catch (error) {
    console.warn('[ProjectPath] Failed to clear project path:', error);
  }
}

/**
 * Get a smart default project path based on current context
 */
export function getSmartDefaultProjectPath(): string {
  // 1. Try localStorage first
  const storedPath = getCurrentProjectPath();
  if (storedPath) {
    return storedPath;
  }

  // 2. Try URL parameters
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const projectParam = urlParams.get('project');
    if (projectParam) {
      return projectParam;
    }
  } catch (error) {
    console.warn('[ProjectPath] Failed to read URL parameters:', error);
  }

  // 3. Try global context (set by Tauri/Electron)
  try {
    if (typeof window !== 'undefined' && (window as any).__ORCHESTRA_PROJECT_PATH__) {
      return (window as any).__ORCHESTRA_PROJECT_PATH__;
    }
  } catch (error) {
    console.warn('[ProjectPath] Failed to read global context:', error);
  }

  // 4. Default to Orchestra's own directory
  return '/Users/tim/Code/orchestra';
}

/**
 * Initialize project path on app startup
 */
export function initializeProjectPath(): void {
  // Set the default project path if none exists
  if (!getCurrentProjectPath()) {
    setCurrentProjectPath(getSmartDefaultProjectPath());
  }
}

/**
 * Project path utilities for UI components
 */
export const projectPathUtils = {
  set: setCurrentProjectPath,
  get: getCurrentProjectPath,
  clear: clearCurrentProjectPath,
  getSmartDefault: getSmartDefaultProjectPath,
  initialize: initializeProjectPath,
  
  /**
   * Format path for display (shorten long paths)
   */
  formatForDisplay(path: string, maxLength: number = 50): string {
    if (path.length <= maxLength) {
      return path;
    }
    
    const parts = path.split('/');
    if (parts.length <= 2) {
      return path;
    }
    
    // Show first and last parts with ... in between
    const first = parts[0] || '/';
    const last = parts[parts.length - 1];
    return `${first}/.../${last}`;
  },
  
  /**
   * Validate if a path looks reasonable
   */
  isValidPath(path: string): boolean {
    if (!path || path.trim().length === 0) {
      return false;
    }
    
    // Basic path validation
    const trimmed = path.trim();
    return trimmed.startsWith('/') || !!trimmed.match(/^[A-Za-z]:\\/);
  }
};

export default projectPathUtils;