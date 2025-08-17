/**
 * Core types for the Markdown extension system
 */

import { Extension } from '@codemirror/state';
import { DecorationSet } from '@codemirror/view';

/**
 * Priority levels for extensions
 * Higher priority extensions are processed first
 */
export enum ExtensionPriority {
  Highest = 100,
  High = 75,
  Normal = 50,
  Low = 25,
  Lowest = 0
}

/**
 * Configuration options for an extension
 */
export interface ExtensionConfig {
  /** Unique identifier for the extension */
  id: string;
  /** Display name for the extension */
  name: string;
  /** Whether the extension is enabled */
  enabled: boolean;
  /** Priority level for the extension */
  priority: ExtensionPriority;
  /** Additional configuration options specific to the extension */
  options?: Record<string, any>;
}

/**
 * Interface for a decoration provider
 * Extensions can implement this to provide decorations
 */
export interface DecorationProvider {
  /**
   * Get decorations for the current editor state
   * @returns A DecorationSet or null if no decorations
   */
  getDecorations(): DecorationSet | null;
}

/**
 * Interface for a markdown extension
 * All extensions must implement this interface
 */
export interface MarkdownExtension {
  /**
   * Get the configuration for this extension
   */
  getConfig(): ExtensionConfig;
  
  /**
   * Create the CodeMirror extensions for this extension
   * @returns An array of CodeMirror extensions
   */
  createExtensions(): Extension[];
  
  /**
   * Initialize the extension
   * Called when the extension is first registered
   */
  initialize?(): void;
  
  /**
   * Update the extension with new configuration
   * @param config New configuration options
   */
  updateConfig?(config: Partial<ExtensionConfig>): void;
  
  /**
   * Clean up the extension
   * Called when the extension is removed or disabled
   */
  cleanup?(): void;
}