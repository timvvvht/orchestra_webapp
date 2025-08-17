/**
 * ActiveLineExtension for highlighting the active line
 * 
 * This is a simple example extension that demonstrates how to use the extension system.
 */

import { Decoration, EditorView } from '@codemirror/view';
import { BaseDecorationExtension } from '../../core/BaseDecorationExtension';
import { ExtensionPriority } from '../../core/types';
import { SortableDecoration } from '../../core/DecorationManager';
import { getActiveLine } from '../../core/utils';

/**
 * Extension for highlighting the active line
 */
export class ActiveLineExtension extends BaseDecorationExtension {
  /**
   * Create a new ActiveLineExtension
   */
  constructor() {
    super({
      id: 'active-line',
      name: 'Active Line Highlighter',
      priority: ExtensionPriority.High,
      enabled: true
    });
    
    console.log('[ActiveLineExtension] Created');
  }
  
  /**
   * Create decorations for the active line
   * @param view The CodeMirror editor view
   * @returns An array of sortable decorations
   */
  createDecorations(view: EditorView): SortableDecoration[] {
    try {
      const { state } = view;
      const activeLineNumber = getActiveLine(view);
      const line = state.doc.line(activeLineNumber);
      
      console.log(`[ActiveLineExtension] Creating decoration for active line ${activeLineNumber}`);
      
      // Create a decoration for the active line
      return [{
        from: line.from,
        to: line.from,
        decoration: Decoration.line({ class: 'cm-active-line cm-activeLine' }), // Add both classes for compatibility
        priority: 100, // High priority to ensure it's applied first
        source: this.config.id
      }];
    } catch (error) {
      console.error('[ActiveLineExtension] Error creating decorations:', error);
      return [];
    }
  }
  
  /**
   * Create the CodeMirror extensions for this extension
   * @returns An array of CodeMirror extensions
   */
  createExtensions() {
    console.log('[ActiveLineExtension] Creating extensions');
    
    // Log the current state of the decoration manager
    if (this.decorationManager) {
      console.log('[ActiveLineExtension] Decoration manager is available');
    } else {
      console.warn('[ActiveLineExtension] No decoration manager available');
    }
    
    return [
      // Add the view plugin for decorations
      this.createViewPlugin(),
      
      // Add the theme for styling the active line
      EditorView.theme({
        '.cm-active-line, .cm-activeLine': {
          backgroundColor: 'var(--background-modifier-hover) !important',
        }
      })
    ];
  }
}