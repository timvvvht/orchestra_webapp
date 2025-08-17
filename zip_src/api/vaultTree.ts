/**
 * API wrapper for the get_vault_tree Tauri command
 * 
 * This module provides a TypeScript interface to the Rust get_vault_tree command
 * that returns the output of `tree -L 1 -a --dirsfirst` for the user's vault directory.
 */

import { invoke } from '@tauri-apps/api/core';

/**
 * Options for the getVaultTree function
 */
export interface VaultTreeOptions {
  /** Optional override path for the vault directory */
  vaultPath?: string;
}

/**
 * Calls the get_vault_tree Tauri command to get directory tree output
 * 
 * @param options Optional configuration for the vault tree command
 * @returns Promise resolving to the tree command output as a string
 * @throws Error if the command fails or vault path is not configured
 */
export async function getVaultTree(options: VaultTreeOptions = {}): Promise<string> {
  try {
    console.log('[VaultTreeAPI] Calling get_vault_tree with options:', options);
    
    const result = await invoke<string>('get_vault_tree', {
      vaultPath: options.vaultPath || null
    });
    
    console.log('[VaultTreeAPI] Successfully retrieved vault tree');
    return result;
    
  } catch (error) {
    console.error('[VaultTreeAPI] Failed to get vault tree:', error);
    throw new Error(`Failed to get vault tree: ${error instanceof Error ? error.message : String(error)}`);
  }
}