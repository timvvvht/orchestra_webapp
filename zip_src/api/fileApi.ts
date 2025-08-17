import { invoke } from '@tauri-apps/api/core';

/**
 * Type definitions for file operations
 */
export interface MarkdownFile {
  path: string;
  name: string;
  is_directory: boolean;
  children?: MarkdownFile[];
}

export interface FileOperationResult {
  success: boolean;
  message: string;
  path?: string;
}

/**
 * Opens a folder selection dialog and returns the selected path
 */
export async function selectFolder(): Promise<string | null> {
  try {
    const result = await invoke<string>('select_folder');
    return result || null;
  } catch (error) {
    console.error('Error selecting folder:', error);
    return null;
  }
}

/**
 * Gets all markdown files from a directory
 */
export async function getMarkdownFiles(dirPath: string): Promise<MarkdownFile[]> {
  try {
    return await invoke('get_markdown_files', { path: dirPath });
  } catch (error) {
    console.error('Error getting markdown files:', error);
    return [];
  }
}

/**
 * Gets the content of a file by its path
 */
export async function getFileContent(filePath: string): Promise<string> {
  try {
    const result = await invoke<string>('get_file_content', { path: filePath });
    return result;
  } catch (error) {
    console.error('Error getting file content:', error);
    throw new Error(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Saves content to a file
 */
export async function saveFileContent(filePath: string, content: string): Promise<FileOperationResult> {
  try {
    await invoke('save_file_content', { content, path: filePath });
    return {
      success: true,
      message: 'File saved successfully',
      path: filePath
    };
  } catch (error) {
    console.error('Error saving file content:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
      path: filePath
    };
  }
}

/**
 * Creates a new markdown file
 */
export async function createNewFile(dirPath: string, fileName: string): Promise<FileOperationResult> {
  try {
    return await invoke('create_new_file', { folder_path: dirPath, filename: fileName });
  } catch (error) {
    console.error('Error creating new file:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Deletes a file
 */
export async function deleteFile(filePath: string): Promise<FileOperationResult> {
  try {
    return await invoke('delete_file', { path: filePath });
  } catch (error) {
    console.error('Error deleting file:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Gets the file path from a node ID
 */
export async function getNodePath(nodeId: string): Promise<string> {
  try {
    return await invoke<string>('get_node_path', { nodeId });
  } catch (error) {
    console.error('Error getting node path:', error);
    throw new Error(error instanceof Error ? error.message : String(error));
  }
}