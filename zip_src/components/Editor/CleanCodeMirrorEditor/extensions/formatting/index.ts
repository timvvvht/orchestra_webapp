/**
 * Main coordinator for Markdown formatting extensions.
 * Combines all renderers and provides a unified interface.
 */
import { Extension, Compartment } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { renderHeadings } from './renderers/render-headings';
import { renderEmphasis } from './renderers/render-emphasis';
import { renderCode } from './renderers/render-code';
import { renderLinks } from './renderers/render-links';
import { renderLists } from './renderers/render-lists';
// Create compartments for each renderer to allow dynamic enabling/disabling
const headingsCompartment = new Compartment();
const emphasisCompartment = new Compartment();
const codeCompartment = new Compartment();
const linksCompartment = new Compartment();
const listsCompartment = new Compartment();

/**
 * Configuration options for the formatting extensions.
 */
export interface FormattingOptions {
  renderHeadings?: boolean;
  renderEmphasis?: boolean;
  renderCode?: boolean;
  renderLinks?: boolean;
  renderLists?: boolean;
}

/**
 * Creates a unified formatting extension with the specified options.
 */
export function createFormattingExtension(options: FormattingOptions = {}): Extension[] {
  const extensions: Extension[] = [
    // Add the base theme that applies to all formatting elements
    EditorView.baseTheme({
      // Default state for all formatting markers
      '.cm-formatting': {
        display: 'none',
        color: 'var(--text-muted)',
        fontSize: '0.85em',
        opacity: 0.8
      },
      // Show general formatting markers on active line (but not headers or lists)
      '.cm-line.cm-activeLine .cm-formatting:not(.cm-formatting-header):not(.cm-formatting-list)': {
        display: 'inline'
      },
      // Header markers on active line should be visible but subtle
      '.cm-formatting-header-visible': {
        display: 'inline !important',
        visibility: 'visible !important',
        color: 'var(--text-muted)',
        opacity: '0.5',
        fontSize: '0.9em'
      },
      // ALWAYS show list markers - this is critical for Obsidian-like behavior
      '.cm-formatting-list': {
        display: 'inline !important',
        opacity: '1 !important',
        color: 'var(--text-muted) !important'
      },
      // Ensure header styling is consistent
      '.cm-header': {
        fontWeight: 'bold',
        lineHeight: '1.4'
      },
      // Orchestra theme headers - majestic and vibey!
      '.cm-header-1': { 
        fontSize: '20px',
        fontWeight: '300',
        letterSpacing: '-0.02em',
        color: 'rgba(255, 255, 255, 0.95)',
        textShadow: '0 0 30px rgba(0, 119, 237, 0.15)',
        borderBottom: '1px solid rgba(0, 119, 237, 0.1)',
        paddingBottom: '0.3em'
      },
      '.cm-header-2': { 
        fontSize: '18px',
        fontWeight: '400',
        letterSpacing: '-0.01em',
        color: 'rgba(255, 255, 255, 0.9)',
        textShadow: '0 0 25px rgba(147, 51, 234, 0.12)'
      },
      '.cm-header-3': { 
        fontSize: '16px',
        fontWeight: '500',
        color: 'rgba(255, 255, 255, 0.85)',
        textShadow: '0 0 20px rgba(137, 221, 255, 0.1)'
      },
      '.cm-header-4': { 
        fontSize: '15px',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'rgba(255, 255, 255, 0.7)',
        textShadow: '0 0 15px rgba(255, 203, 107, 0.08)'
      },
      '.cm-header-5': { 
        fontSize: '14px',
        fontWeight: '600',
        letterSpacing: '0.02em',
        color: 'rgba(255, 255, 255, 0.65)',
        textShadow: '0 0 12px rgba(195, 232, 141, 0.06)'
      },
      '.cm-header-6': { 
        fontSize: '13px',
        fontWeight: '500',
        fontStyle: 'italic',
        color: 'rgba(255, 255, 255, 0.6)',
        textShadow: '0 0 10px rgba(247, 140, 108, 0.05)'
      }
    }),
    
    // Add compartments for each renderer
    headingsCompartment.of(options.renderHeadings !== false ? renderHeadings : []),
    emphasisCompartment.of(options.renderEmphasis !== false ? renderEmphasis : []),
    codeCompartment.of(options.renderCode !== false ? renderCode : []),
    linksCompartment.of(options.renderLinks !== false ? renderLinks : []),
    listsCompartment.of(options.renderLists !== false ? renderLists : [])
  ];
  
  return extensions;
}

/**
 * Reconfigures the formatting extension with new options.
 */
export function reconfigureFormatting(view: EditorView, options: FormattingOptions): void {
  const effects = [];
  
  if (options.renderHeadings !== undefined) {
    effects.push(headingsCompartment.reconfigure(
      options.renderHeadings ? renderHeadings : []
    ));
  }
  
  if (options.renderEmphasis !== undefined) {
    effects.push(emphasisCompartment.reconfigure(
      options.renderEmphasis ? renderEmphasis : []
    ));
  }
  
  if (options.renderCode !== undefined) {
    effects.push(codeCompartment.reconfigure(
      options.renderCode ? renderCode : []
    ));
  }
  
  if (options.renderLinks !== undefined) {
    effects.push(linksCompartment.reconfigure(
      options.renderLinks ? renderLinks : []
    ));
  }
  
  if (options.renderLists !== undefined) {
    effects.push(listsCompartment.reconfigure(
      options.renderLists ? renderLists : []
    ));
  }
  
  if (effects.length > 0) {
    view.dispatch({ effects });
  }
}

/**
 * Compatibility class for the old UnifiedFormattingExtension.
 * This is a simple standalone class that uses the new modular formatting system.
 */
export class UnifiedFormattingExtension {
  /**
   * Creates extensions for the editor.
   */
  createExtensions(): Extension[] {
    return createFormattingExtension();
  }

  /**
   * Set the editor view - maintained for backward compatibility.
   * This method does nothing in the new implementation.
   */
  setView(_view: EditorView): void {
    // No-op - we don't need to store the view in the new implementation
  }

  /**
   * Set the decoration manager - maintained for backward compatibility.
   * This method does nothing in the new implementation.
   */
  setDecorationManager(_manager: any): void {
    // No-op - we don't use the decoration manager in the new implementation
  }
}

// For backward compatibility
export * from './types';