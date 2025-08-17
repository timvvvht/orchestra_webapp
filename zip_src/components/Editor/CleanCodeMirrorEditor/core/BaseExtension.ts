/**
 * BaseExtension abstract class for Markdown extensions
 * 
 * This class provides a base implementation for the MarkdownExtension interface
 * with common functionality and default implementations.
 */

import { Extension } from '@codemirror/state';
import { MarkdownExtension, ExtensionConfig, ExtensionPriority } from './types';

/**
 * Abstract base class for Markdown extensions
 */
export abstract class BaseExtension implements MarkdownExtension {
  protected config: ExtensionConfig;
  
  /**
   * Create a new BaseExtension
   * @param config The extension configuration
   */
  constructor(config: Partial<ExtensionConfig>) {
    // Set default configuration values
    this.config = {
      id: 'unknown',
      name: 'Unknown Extension',
      enabled: true,
      priority: ExtensionPriority.Normal,
      ...config
    };
  }
  
  /**
   * Get the configuration for this extension
   */
  getConfig(): ExtensionConfig {
    return this.config;
  }
  
  /**
   * Update the extension with new configuration
   * @param config New configuration options
   */
  updateConfig(config: Partial<ExtensionConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
  }
  
  /**
   * Initialize the extension
   * Called when the extension is first registered
   */
  initialize(): void {
    // Default implementation does nothing
    console.log(`Initializing extension: ${this.config.name} (${this.config.id})`);
  }
  
  /**
   * Clean up the extension
   * Called when the extension is removed or disabled
   */
  cleanup(): void {
    // Default implementation does nothing
    console.log(`Cleaning up extension: ${this.config.name} (${this.config.id})`);
  }
  
  /**
   * Create the CodeMirror extensions for this extension
   * @returns An array of CodeMirror extensions
   */
  abstract createExtensions(): Extension[];
}