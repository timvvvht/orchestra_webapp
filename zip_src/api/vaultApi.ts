import { invoke } from '@tauri-apps/api/core';
import { TreeNode, InitialStructure } from '../hooks/useVaultStructure';

/**
 * Gets the current vault path
 */
export async function getVaultPath(): Promise<string | null> {
  try {
    const result = await invoke<string | null>('get_vault_path');
    return result;
  } catch (error) {
    console.error('Error getting vault path:', error);
    throw new Error(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Sets the vault path for the application
 */
export async function setVaultPath(path: string): Promise<void> {
  try {
    await invoke('set_vault_path', { path });
  } catch (error) {
    console.error('Error setting vault path:', error);
    throw new Error(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Gets the initial file structure of the vault
 */
export async function getInitialFileStructure(): Promise<InitialStructure> {
  try {
    return await invoke<InitialStructure>('get_initial_file_structure');
  } catch (error) {
    console.error('Error getting initial file structure:', error);
    throw new Error(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Gets the children of a node
 */
export async function getNodeChildren(parentId: string): Promise<TreeNode[]> {
  try {
    return await invoke<TreeNode[]>('get_node_children', { parentId });
  } catch (error) {
    console.error('Error getting node children:', error);
    throw new Error(error instanceof Error ? error.message : String(error));
  }
}