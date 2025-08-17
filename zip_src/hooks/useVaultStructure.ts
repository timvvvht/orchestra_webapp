import { useState, useEffect, useCallback } from 'react';
import { setVaultPath as apiSetVaultPath, getInitialFileStructure, getNodeChildren as apiGetNodeChildren } from '@/api/vaultApi';

// Define the DirectoryNode type
export interface DirectoryNode {
  id: string;
  name: string;
  path: string;
  is_dir: boolean;
  children: string[];
  metadata?: FileMetadata;
  fingerprint: string;
  last_modified: number;
  last_indexed: number;
}

// Define the FileMetadata type
export interface FileMetadata {
  size: number;
  modified: number;
  extension: string;
  is_markdown: boolean;
  frontmatter?: Record<string, string>;
}

// Define the TreeNode type
export interface TreeNode {
  id: string;
  name: string;
  is_dir: boolean;
  has_children: boolean;
  is_markdown: boolean;
  last_modified: number;
}

// Define the InitialStructure type
export interface InitialStructure {
  root: {
    id: string;
    name: string;
    is_dir: boolean;
    has_children: boolean;
    child_count?: number;
    is_markdown: boolean;
    last_modified: number;
  };
  first_level: TreeNode[];
  timestamp: number;
}

// Define the hook return type
interface UseVaultStructureReturn {
  structure: DirectoryNode | null;
  isLoading: boolean;
  error: string | null;
  setVaultPath: (path: string) => Promise<void>;
  getStructure: () => Promise<void>;
  getNodeChildren: (parentId: string) => Promise<TreeNode[]>;
}

/**
 * Hook for accessing and managing the vault structure
 */
export function useVaultStructure(): UseVaultStructureReturn {
  const [structure, setStructure] = useState<DirectoryNode | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentVaultPath, setCurrentVaultPath] = useState<string>('');

  // Set the vault path
  const setVaultPath = useCallback(async (path: string) => {
    try {
      setIsLoading(true);
      setError(null);

      await apiSetVaultPath(path);
      // Update the current vault path to trigger a re-fetch
      setCurrentVaultPath(path);
    } catch (err) {
      setError(`Failed to set vault path: ${err}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get the initial structure
  const getStructure = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get the initial structure
      const result = await getInitialFileStructure();
      console.log('Initial structure:', result);

      // Convert to DirectoryNode
      if (result && result.root) {
        const rootNode: DirectoryNode = {
          id: result.root.id,
          name: result.root.name,
          path: '',
          is_dir: true,
          children: result.first_level.map(node => node.id),
          fingerprint: '',
          last_modified: result.root.last_modified,
          last_indexed: result.timestamp,
        };

        setStructure(rootNode);
      }
    } catch (err) {
      setError(`Failed to get structure: ${err}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get children of a node
  const getNodeChildren = useCallback(async (parentId: string): Promise<TreeNode[]> => {
    try {
      const children = await apiGetNodeChildren(parentId);
      return children;
    } catch (err) {
      setError(`Failed to get node children: ${err}`);
      return [];
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    getStructure();
  }, [getStructure]);

  // Re-fetch structure when vault path changes
  useEffect(() => {
    if (currentVaultPath) {
      getStructure();
    }
  }, [currentVaultPath, getStructure]);

  return {
    structure,
    isLoading,
    error,
    setVaultPath,
    getStructure,
    getNodeChildren,
  };
}