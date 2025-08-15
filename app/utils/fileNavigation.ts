import { getNodePath, getFileContent } from '@/api/fileApi';
import { useSettingsStore } from '@/stores/settingsStore';

export interface FileNavigationResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

export interface NavigationOptions {
  showErrorToast?: boolean;
  validateExists?: boolean;
}

export class FileNavigationService {
  private static instance: FileNavigationService;
  
  public static getInstance(): FileNavigationService {
    if (!FileNavigationService.instance) {
      FileNavigationService.instance = new FileNavigationService();
    }
    return FileNavigationService.instance;
  }

  /**
   * Resolves a file identifier (node ID or file path) to an absolute file path
   * @param identifier - Either a node ID (hash) or file path (contains / or \)
   * @returns Promise<FileNavigationResult>
   */
  async resolveFileIdentifier(identifier: string): Promise<FileNavigationResult> {
    try {
      console.log('[FileNavigation] Resolving identifier:', identifier);
      
      // Detect if it's a file path vs node ID
      if (this.isFilePath(identifier)) {
        // Direct file path - normalize and validate
        const normalizedPath = this.normalizePath(identifier);
        console.log('[FileNavigation] Detected file path, normalized to:', normalizedPath);
        
        return {
          success: true,
          filePath: normalizedPath
        };
      } else {
        // Node ID - resolve via getNodePath
        console.log('[FileNavigation] Detected node ID, resolving via getNodePath');
        const resolvedPath = await getNodePath(identifier);
        console.log('[FileNavigation] Node ID resolved to path:', resolvedPath);
        
        return {
          success: true,
          filePath: resolvedPath
        };
      }
    } catch (error) {
      console.error('[FileNavigation] Failed to resolve identifier:', identifier, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Navigates to a file in the vault editor
   * @param identifier - File path or node ID
   * @param options - Navigation options
   */
  async navigateToFile(identifier: string, options: NavigationOptions = {}): Promise<void> {
    console.log('[FileNavigation] Navigating to file:', identifier);
    
    const result = await this.resolveFileIdentifier(identifier);
    
    if (!result.success || !result.filePath) {
      const errorMessage = result.error || 'Failed to resolve file';
      console.error('[FileNavigation] Navigation failed:', errorMessage);
      
      if (options.showErrorToast) {
        // Import toast dynamically to avoid circular dependencies
        const { toast } = await import('sonner');
        toast.error('File not found', {
          description: `Could not open file: ${errorMessage}`,
          duration: 4000,
        });
      }
      return;
    }

    // Validate file exists if requested
    if (options.validateExists) {
      try {
        await getFileContent(result.filePath);
      } catch (error) {
        console.error('[FileNavigation] File validation failed:', error);
        if (options.showErrorToast) {
          const { toast } = await import('sonner');
          toast.error('File not accessible', {
            description: `Could not read file: ${result.filePath}`,
            duration: 4000,
          });
        }
        return;
      }
    }

    // Perform navigation using existing localStorage approach
    this.performNavigation(result.filePath);
  }

  /**
   * Creates a vault:// link for any file reference
   * @param pathOrNodeId - File path or node ID
   * @returns vault:// URL string
   */
  createVaultLink(pathOrNodeId: string): string {
    return `vault://${encodeURIComponent(pathOrNodeId)}`;
  }

  /**
   * Extracts file identifier from vault:// URL
   * @param vaultUrl - vault:// URL
   * @returns decoded file identifier
   */
  extractFromVaultLink(vaultUrl: string): string {
    if (!vaultUrl.startsWith('vault://')) {
      throw new Error('Invalid vault URL');
    }
    return decodeURIComponent(vaultUrl.replace('vault://', ''));
  }

  /**
   * Determines if an identifier is a file path vs node ID
   * @param identifier - String to check
   * @returns true if it's a file path, false if it's a node ID
   */
  private isFilePath(identifier: string): boolean {
    // File paths contain / or \ or have file extensions
    return identifier.includes('/') || 
           identifier.includes('\\') || 
           /\.[a-zA-Z0-9]+$/.test(identifier);
  }

  /**
   * Normalizes a file path (handles relative paths, etc.)
   * @param path - Raw file path
   * @returns normalized absolute path
   */
  private normalizePath(path: string): string {
    // Remove quotes if present
    let cleanPath = path.replace(/^["'`]|["'`]$/g, '');
    
    // Handle relative paths by making them relative to vault root
    if (cleanPath.startsWith('./')) {
      const vaultPath = useSettingsStore.getState().settings.vault.path;
      if (vaultPath) {
        cleanPath = cleanPath.replace('./', `${vaultPath}/`);
      }
    }
    
    // Normalize path separators for current platform
    cleanPath = cleanPath.replace(/[/\\]+/g, '/');
    
    return cleanPath;
  }

  /**
   * Performs the actual navigation using existing localStorage approach
   * @param filePath - Absolute file path to navigate to
   */
  private performNavigation(filePath: string): void {
    console.log('[FileNavigation] Performing navigation to:', filePath);
    
    // Store the file path in localStorage for VaultPage to pick up
    localStorage.setItem('selectedFilePath', filePath);
    console.log('[FileNavigation] Stored file path in localStorage');
    
    // Navigate to vault page
    if (window.location.pathname !== '/vault') {
      console.log('[FileNavigation] Navigating to /vault');
      window.location.href = '/vault';
    } else {
      // Already on vault page, trigger a reload to pick up the new file
      console.log('[FileNavigation] Already on vault page, triggering reload');
      window.location.reload();
    }
  }
}

// Export singleton instance
export const fileNavigationService = FileNavigationService.getInstance();