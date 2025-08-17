/**
 * BaseDecorationExtension abstract class for extensions that provide decorations
 * 
 * This class extends BaseExtension and provides common functionality for
 * extensions that provide decorations to the editor.
 */

import { Extension } from '@codemirror/state';
import { DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { BaseExtension } from './BaseExtension';
import { ExtensionConfig } from './types';
import { DecorationManager, SortableDecoration } from './DecorationManager';

/**
 * Abstract base class for extensions that provide decorations
 */
export abstract class BaseDecorationExtension extends BaseExtension {
  protected decorationManager: DecorationManager | null = null;
  protected view: EditorView | null = null;
  
  /**
   * Create a new BaseDecorationExtension
   * @param config The extension configuration
   */
  constructor(config: Partial<ExtensionConfig>) {
    super(config);
  }
  
  /**
   * Set the decoration manager
   * @param manager The decoration manager to use
   */
  setDecorationManager(manager: DecorationManager): void {
    console.log(`[${this.config.id}] Setting decoration manager`);
    this.decorationManager = manager;
  }
  
  /**
   * Set the editor view
   * @param view The CodeMirror editor view
   */
  setView(view: EditorView): void {
    console.log(`[${this.config.id}] Setting view`);
    this.view = view;
    
    // If we have a decoration manager, make sure it's set
    if (this.decorationManager === null && view) {
      console.warn(`[${this.config.id}] View set but no decoration manager available`);
    }
  }
  
  /**
   * Create decorations for the current editor state
   * @param view The CodeMirror editor view
   * @returns An array of sortable decorations
   */
  abstract createDecorations(view: EditorView): SortableDecoration[];
  
  /**
   * Create a ViewPlugin for this extension
   * @returns A CodeMirror ViewPlugin
   */
  protected createViewPlugin(): Extension {
    const extension = this;
    
    return ViewPlugin.define(
      (view) => {
        // Store the view for later use
        extension.setView(view);
        
        console.log(`[${extension.config.id}] Creating view plugin`);
        
        // Initial decoration creation
        if (extension.decorationManager && extension.config.enabled) {
          console.log(`[${extension.config.id}] Creating initial decorations`);
          const decorations = extension.createDecorations(view);
          console.log(`[${extension.config.id}] Created ${decorations.length} initial decorations`);
          extension.decorationManager.addDecorations(decorations);
        } else {
          console.warn(`[${extension.config.id}] Cannot create decorations: decorationManager=${!!extension.decorationManager}, enabled=${extension.config.enabled}`);
        }
        
        return {
          update(update: ViewUpdate) {
            // Skip if the extension is disabled
            if (!extension.config.enabled) {
              console.log(`[${extension.config.id}] Extension disabled, skipping update`);
              return;
            }
            
            // Skip if we don't have a decoration manager
            if (!extension.decorationManager) {
              console.warn(`[${extension.config.id}] No decoration manager, skipping update`);
              return;
            }
            
            // Remove old decorations from this extension
            console.log(`[${extension.config.id}] Removing old decorations`);
            extension.decorationManager.removeDecorationsFromSource(extension.config.id);
            
            // Create new decorations
            console.log(`[${extension.config.id}] Creating new decorations`);
            const decorations = extension.createDecorations(update.view);
            console.log(`[${extension.config.id}] Created ${decorations.length} new decorations`);
            extension.decorationManager.addDecorations(decorations);
          },
          destroy() {
            // Remove decorations when the plugin is destroyed
            if (extension.decorationManager) {
              console.log(`[${extension.config.id}] Removing decorations on destroy`);
              extension.decorationManager.removeDecorationsFromSource(extension.config.id);
            }
          }
        };
      }
    );
  }
  
  /**
   * Create the CodeMirror extensions for this extension
   * @returns An array of CodeMirror extensions
   */
  createExtensions(): Extension[] {
    // Skip if the extension is disabled
    if (!this.config.enabled) {
      return [];
    }
    
    return [this.createViewPlugin()];
  }
}