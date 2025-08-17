/**
 * ExtensionManager for managing Markdown extensions
 * 
 * This class is responsible for registering, enabling/disabling, and managing extensions.
 * It coordinates with the DecorationManager to handle decorations from multiple extensions.
 */

import { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { MarkdownExtension, ExtensionConfig, ExtensionPriority } from './types';
import { DecorationManager } from './DecorationManager';

/**
 * Manager for handling multiple Markdown extensions
 */
export class ExtensionManager {
  private extensions: Map<string, MarkdownExtension> = new Map();
  private decorationManager: DecorationManager;
  private view: EditorView | null = null;
  
  /**
   * Create a new ExtensionManager
   * @param decorationManager The decoration manager to use
   */
  constructor(decorationManager: DecorationManager) {
    this.decorationManager = decorationManager;
  }
  
  /**
   * Set the editor view
   * @param view The CodeMirror editor view
   */
  setView(view: EditorView): void {
    console.log('[ExtensionManager] Setting view for all extensions');
    this.view = view;
    this.decorationManager.setView(view);
    
    // Set the view for all extensions
    for (const extension of this.extensions.values()) {
      const config = extension.getConfig();
      console.log(`[ExtensionManager] Setting view for extension: ${config.id}`);
      
      // Set the decoration manager first to ensure it's available when setView is called
      if ('setDecorationManager' in extension) {
        try {
          // @ts-ignore - We know this is safe because we checked for the method
          extension.setDecorationManager(this.decorationManager);
          console.log(`[ExtensionManager] Set decoration manager for extension: ${config.id}`);
        } catch (error) {
          console.error(`[ExtensionManager] Error setting decoration manager for extension: ${config.id}`, error);
        }
      }
      
      // Now set the view
      extension.setView(view);
    }
  }
  
  /**
   * Register a new extension
   * @param extension The extension to register
   * @returns True if the extension was registered, false if it was already registered
   */
  registerExtension(extension: MarkdownExtension): boolean {
    const config = extension.getConfig();
    console.log(`[ExtensionManager] Registering extension: ${config.name} (${config.id})`);
    
    // Check if the extension is already registered
    if (this.extensions.has(config.id)) {
      console.warn(`[ExtensionManager] Extension with ID ${config.id} is already registered`);
      return false;
    }
    
    // Register the extension
    this.extensions.set(config.id, extension);
    
    // Set the decoration manager if the extension supports it
    if ('setDecorationManager' in extension) {
      try {
        // @ts-ignore - We know this is safe because we checked for the method
        extension.setDecorationManager(this.decorationManager);
        console.log(`[ExtensionManager] Set decoration manager for extension: ${config.id}`);
      } catch (error) {
        console.error(`[ExtensionManager] Error setting decoration manager for extension: ${config.id}`, error);
      }
    }
    
    // Set the view if we have one
    if (this.view && 'setView' in extension) {
      console.log(`[ExtensionManager] Setting view for extension: ${config.id}`);
      extension.setView(this.view);
    } else if (this.view) {
      console.warn(`[ExtensionManager] Extension ${config.id} does not support setView`);
    } else {
      console.log(`[ExtensionManager] No view available yet for extension: ${config.id}`);
    }
    
    // Initialize the extension if it has an initialize method
    if (extension.initialize) {
      console.log(`[ExtensionManager] Initializing extension: ${config.id}`);
      extension.initialize();
    }
    
    console.log(`[ExtensionManager] Successfully registered extension: ${config.name} (${config.id})`);
    return true;
  }
  
  /**
   * Unregister an extension
   * @param id The ID of the extension to unregister
   * @returns True if the extension was unregistered, false if it wasn't registered
   */
  unregisterExtension(id: string): boolean {
    const extension = this.extensions.get(id);
    
    if (!extension) {
      console.warn(`Extension with ID ${id} is not registered`);
      return false;
    }
    
    // Clean up the extension if it has a cleanup method
    if (extension.cleanup) {
      extension.cleanup();
    }
    
    // Remove any decorations from this extension
    this.decorationManager.removeDecorationsFromSource(id);
    
    // Unregister the extension
    this.extensions.delete(id);
    
    console.log(`Unregistered extension: ${extension.getConfig().name} (${id})`);
    return true;
  }
  
  /**
   * Enable or disable an extension
   * @param id The ID of the extension to enable/disable
   * @param enabled Whether to enable or disable the extension
   * @returns True if the extension was enabled/disabled, false if it wasn't registered
   */
  setExtensionEnabled(id: string, enabled: boolean): boolean {
    const extension = this.extensions.get(id);
    
    if (!extension) {
      console.warn(`Extension with ID ${id} is not registered`);
      return false;
    }
    
    const config = extension.getConfig();
    
    // Skip if the extension is already in the desired state
    if (config.enabled === enabled) {
      return true;
    }
    
    // Update the extension's configuration
    if (extension.updateConfig) {
      extension.updateConfig({ enabled });
    }
    
    // If disabling, remove any decorations from this extension
    if (!enabled) {
      this.decorationManager.removeDecorationsFromSource(id);
    }
    
    console.log(`${enabled ? 'Enabled' : 'Disabled'} extension: ${config.name} (${id})`);
    return true;
  }
  
  /**
   * Get all registered extensions
   * @returns An array of all registered extensions
   */
  getAllExtensions(): MarkdownExtension[] {
    return Array.from(this.extensions.values());
  }
  
  /**
   * Get all enabled extensions
   * @returns An array of all enabled extensions
   */
  getEnabledExtensions(): MarkdownExtension[] {
    return Array.from(this.extensions.values())
      .filter(ext => ext.getConfig().enabled)
      .sort((a, b) => {
        // Sort by priority (higher priority first)
        return b.getConfig().priority - a.getConfig().priority;
      });
  }
  
  /**
   * Get an extension by ID
   * @param id The ID of the extension to get
   * @returns The extension, or undefined if not found
   */
  getExtension(id: string): MarkdownExtension | undefined {
    return this.extensions.get(id);
  }
  
  /**
   * Create all extensions for CodeMirror
   * @returns An array of CodeMirror extensions
   */
  createExtensions(): Extension[] {
    const extensions: Extension[] = [];
    
    // Get all enabled extensions, sorted by priority
    const enabledExtensions = this.getEnabledExtensions();
    
    // Create extensions for each enabled extension
    for (const extension of enabledExtensions) {
      const cmExtensions = extension.createExtensions();
      extensions.push(...cmExtensions);
    }
    
    return extensions;
  }
  
  /**
   * Get statistics about registered extensions
   * @returns An object with extension statistics
   */
  getStats(): { total: number; enabled: number; byPriority: Record<string, number> } {
    const enabledExtensions = this.getEnabledExtensions();
    const byPriority: Record<string, number> = {};
    
    // Count extensions by priority
    for (const ext of this.extensions.values()) {
      const priority = ExtensionPriority[ext.getConfig().priority];
      byPriority[priority] = (byPriority[priority] || 0) + 1;
    }
    
    return {
      total: this.extensions.size,
      enabled: enabledExtensions.length,
      byPriority
    };
  }
}