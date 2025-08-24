// webapp/src/api/fileApi.ts
// Minimal shim for web environment - provides safe defaults without crashing

export type FileInfo = {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  lastModified?: Date;
};

/**
 * Opens a file in the default editor
 * In web environment, copies path to clipboard as fallback
 */
export async function openInEditor(path: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(path);
    console.info(`[fileApi] Copied path to clipboard: ${path}`);
    
    // Optional: Show a toast notification if you have a toast system
    // toast.info(`Copied path to clipboard: ${path}`);
  } catch (error) {
    console.warn('[fileApi] Could not copy path to clipboard in web environment:', error);
  }
}

/**
 * Reads file content
 * Not implemented in web environment - returns empty string
 */
export async function readFile(path: string): Promise<string> {
  console.warn(`[fileApi] readFile not implemented in web environment for: ${path}`);
  return '';
}

/**
 * Writes content to file
 * Not implemented in web environment - no-op
 */
export async function writeFile(path: string, content: string): Promise<void> {
  console.warn(`[fileApi] writeFile not implemented in web environment for: ${path}`);
  // In a real implementation, this might call a backend API
}

/**
 * Lists directory contents
 * Not implemented in web environment - returns empty array
 */
export async function listDirectory(path: string): Promise<FileInfo[]> {
  console.warn(`[fileApi] listDirectory not implemented in web environment for: ${path}`);
  return [];
}

/**
 * Checks if a file or directory exists
 * Not implemented in web environment - returns false
 */
export async function exists(path: string): Promise<boolean> {
  console.warn(`[fileApi] exists not implemented in web environment for: ${path}`);
  return false;
}

/**
 * Gets file information/stats
 * Not implemented in web environment - returns null
 */
export async function getFileInfo(path: string): Promise<FileInfo | null> {
  console.warn(`[fileApi] getFileInfo not implemented in web environment for: ${path}`);
  return null;
}

/**
 * Opens a file dialog to select files
 * Uses HTML file input as fallback in web environment
 */
export async function openFileDialog(options?: {
  multiple?: boolean;
  accept?: string;
  directory?: boolean;
}): Promise<string[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = options?.multiple || false;
    if (options?.accept) {
      input.accept = options.accept;
    }
    
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        const paths = Array.from(files).map(file => file.name);
        resolve(paths);
      } else {
        resolve([]);
      }
    };
    
    input.oncancel = () => resolve([]);
    
    input.click();
  });
}

/**
 * Shows a file in the system file manager
 * Not implemented in web environment - copies path to clipboard
 */
export async function showInFileManager(path: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(path);
    console.info(`[fileApi] Copied path to clipboard (show in file manager): ${path}`);
  } catch (error) {
    console.warn('[fileApi] Could not copy path to clipboard:', error);
  }
}

/**
 * Normalizes path input from vault:// or @file: prefixes
 * Minimal normalization for web environment
 */
export function getNodePath(input: string): string {
  if (!input) return '';
  
  // Normalize common prefixes into a simple path-like string
  if (input.startsWith('vault://')) {
    return input.replace(/^vault:\/\//, '');
  }
  if (input.startsWith('@file:')) {
    return input.replace(/^@file:/, '');
  }
  return input;
}

/**
 * Reads file content (web shim)
 * Not implemented in web environment — returns an empty string to avoid crashes.
 */
export async function getFileContent(path: string): Promise<string> {
  console.warn(`[fileApi] getFileContent not implemented in web environment for: ${path}`);
  return '';
}

// Export default object for compatibility
export default {
  openInEditor,
  readFile,
  writeFile,
  listDirectory,
  exists,
  getFileInfo,
  openFileDialog,
  showInFileManager,
  getNodePath,
  getFileContent,
};