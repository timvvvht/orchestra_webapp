/**
 * File API for web app
 * Stub implementation - file operations are handled differently in web environment
 */

export interface FileNode {
  path: string;
  name: string;
  isDirectory: boolean;
  children?: FileNode[];
}

export interface FileContent {
  content: string;
  encoding: string;
  path: string;
}

/**
 * Get node path information
 * Stub implementation for web app
 */
export async function getNodePath(path: string): Promise<FileNode | null> {
  console.warn('[FileApi] Stub implementation - getNodePath not functional in web app');
  return null;
}

/**
 * Get file content
 * Stub implementation for web app
 */
export async function getFileContent(path: string): Promise<FileContent | null> {
  console.warn('[FileApi] Stub implementation - getFileContent not functional in web app');
  return null;
}

/**
 * Check if file exists
 * Stub implementation for web app
 */
export async function fileExists(path: string): Promise<boolean> {
  console.warn('[FileApi] Stub implementation - fileExists not functional in web app');
  return false;
}

/**
 * List directory contents
 * Stub implementation for web app
 */
export async function listDirectory(path: string): Promise<FileNode[]> {
  console.warn('[FileApi] Stub implementation - listDirectory not functional in web app');
  return [];
}