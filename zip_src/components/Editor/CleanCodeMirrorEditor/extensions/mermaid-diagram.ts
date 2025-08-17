/**
 * Mermaid Diagram Extension for CodeMirror 6
 * 
 * This extension provides support for rendering Mermaid diagrams in the editor.
 * It detects code blocks with the 'mermaid' language identifier and renders them as diagrams.
 */

import { Extension } from '@codemirror/state';
import { ViewPlugin, DecorationSet, Decoration, EditorView, WidgetType, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import mermaid from 'mermaid';

// Initialize mermaid with default configuration
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose', // Allows rendering of external links
  fontFamily: 'var(--font-monospace, monospace)',
});

// Flag to enable detailed debugging
const DEBUG_MERMAID = true;

/**
 * Widget for rendering Mermaid diagrams
 */
class MermaidWidget extends WidgetType {
  private static idCounter = 0;
  private id: string;
  private renderComplete: boolean = false;
  private error: string | null = null;

  constructor(
    readonly content: string,
    readonly darkMode: boolean
  ) {
    super();
    this.id = `mermaid-diagram-${MermaidWidget.idCounter++}`;
  }

  eq(other: MermaidWidget): boolean {
    return this.content === other.content && this.darkMode === other.darkMode;
  }

  toDOM(): HTMLElement {
    // Create container element
    const container = document.createElement('div');
    container.className = 'mermaid-diagram-container';
    
    // Add a label to indicate this is a preview
    const label = document.createElement('div');
    label.className = 'mermaid-preview-label';
    label.textContent = 'Diagram Preview';
    container.appendChild(label);
    
    // Create diagram element
    const diagram = document.createElement('div');
    diagram.id = this.id;
    diagram.className = 'mermaid-diagram';
    container.appendChild(diagram);
    
    // Create hide button to collapse the preview
    const hideButton = document.createElement('button');
    hideButton.className = 'mermaid-hide-button';
    hideButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    hideButton.title = 'Hide preview';
    container.appendChild(hideButton);
    
    // Add hide functionality
    hideButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Remove the container from the DOM
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    });
    
    // Show loading state
    diagram.innerHTML = '<div class="mermaid-loading">Rendering diagram...</div>';
    
    // Render the diagram after the element is added to the DOM
    setTimeout(() => {
      try {
        if (DEBUG_MERMAID) {
          console.log('[MermaidDiagram] Rendering diagram with content:', this.content.substring(0, 100) + (this.content.length > 100 ? '...' : ''));
          console.log('[MermaidDiagram] Dark mode:', this.darkMode);
        }
        
        // Set theme based on dark mode
        mermaid.initialize({
          theme: this.darkMode ? 'dark' : 'default',
        });
        
        // Render the diagram
        mermaid.render(this.id, this.content).then(({ svg, bindFunctions }) => {
          diagram.innerHTML = svg;
          if (bindFunctions) bindFunctions(diagram);
          this.renderComplete = true;
          
          if (DEBUG_MERMAID) {
            console.log('[MermaidDiagram] Successfully rendered diagram');
          }
          
          // Add success class
          container.classList.add('mermaid-render-success');
        }).catch(error => {
          console.error('[MermaidDiagram] Rendering error:', error);
          this.error = error.message || 'Error rendering diagram';
          this.renderComplete = false;
          
          // Show error message
          diagram.innerHTML = `<div class="mermaid-error">
            <h4>Diagram Error</h4>
            <p>${this.error}</p>
          </div>`;
          
          // Add error class
          container.classList.add('mermaid-render-error');
        });
      } catch (error) {
        console.error('[MermaidDiagram] Error:', error);
        this.error = error.message || 'Error rendering diagram';
        this.renderComplete = false;
        
        // Show error message
        diagram.innerHTML = `<div class="mermaid-error">
          <h4>Diagram Error</h4>
          <p>${this.error}</p>
        </div>`;
        
        // Add error class
        container.classList.add('mermaid-render-error');
      }
    }, 10);
    
    return container;
  }
  
  // Clean up resources when widget is removed
  destroy(dom: HTMLElement): void {
    // Nothing to clean up for now
  }
}

/**
 * Plugin that detects and renders Mermaid diagrams
 */
const mermaidPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    isDarkMode: boolean;
    
    constructor(view: EditorView) {
      // Detect dark mode
      this.isDarkMode = document.documentElement.classList.contains('dark') || 
                       document.body.classList.contains('dark') ||
                       view.dom.closest('.theme-dark') !== null;
      
      this.decorations = this.buildDecorations(view);
    }
    
    update(update: ViewUpdate) {
      // Check if dark mode has changed
      const newDarkMode = document.documentElement.classList.contains('dark') || 
                         document.body.classList.contains('dark') ||
                         update.view.dom.closest('.theme-dark') !== null;
      
      if (update.docChanged || update.viewportChanged || this.isDarkMode !== newDarkMode) {
        this.isDarkMode = newDarkMode;
        this.decorations = this.buildDecorations(update.view);
      }
    }
    
    buildDecorations(view: EditorView): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>();
      const { state } = view;
      const { doc } = state;
      
      // Track code block state
      let inMermaidBlock = false;
      let mermaidBlockStart = -1;
      let mermaidBlockContent = '';
      let mermaidBlockStartLine = -1;
      let mermaidBlockEndLine = -1;
      
      // Process each line in the document to identify Mermaid code blocks
      for (let i = 1; i <= doc.lines; i++) {
        const line = doc.line(i);
        const lineText = line.text;
        
        // Check for code fence markers
        const isCodeFence = /^\s*```([a-zA-Z0-9_+#-]*)\s*$/.test(lineText);
        
        if (isCodeFence) {
          // Check if this is the start of a Mermaid block
          if (!inMermaidBlock) {
            const match = lineText.match(/^\s*```([a-zA-Z0-9_+#-]*)\s*$/);
            const language = match && match[1] ? match[1].trim().toLowerCase() : '';
            
            if (language === 'mermaid') {
              inMermaidBlock = true;
              mermaidBlockStart = line.from;
              mermaidBlockContent = '';
              mermaidBlockStartLine = i;
              
              if (DEBUG_MERMAID) {
                console.log(`[MermaidDiagram] Found start of Mermaid diagram at line ${i}`);
              }
              
              // Add a mark to the start line to identify it as a Mermaid block
              // This will help the enhanced-code-fence extension to skip it
              builder.add(
                line.from,
                line.to,
                Decoration.mark({
                  class: 'cm-mermaid-block-marker',
                  attributes: { 'data-mermaid-block': 'start', 'data-line': `${i}` }
                })
              );
            }
          } 
          // Check if this is the end of a Mermaid block
          else {
            inMermaidBlock = false;
            mermaidBlockEndLine = i;
            
            if (DEBUG_MERMAID) {
              console.log(`[MermaidDiagram] Found end of Mermaid diagram at line ${i}`);
              console.log(`[MermaidDiagram] Mermaid content: ${mermaidBlockContent.substring(0, 100)}...`);
            }
            
            // Add a mark to the end line to identify it as a Mermaid block
            builder.add(
              line.from,
              line.to,
              Decoration.mark({
                class: 'cm-mermaid-block-marker',
                attributes: { 'data-mermaid-block': 'end', 'data-line': `${i}` }
              })
            );
            
            // Add decoration for the Mermaid diagram
            if (mermaidBlockContent.trim()) {
              // Find the end of the code block (after the closing ```) to place our widget
              const endLine = doc.line(mermaidBlockEndLine);
              const widgetPos = endLine.to;
              
              // Add a widget decoration AFTER the code block instead of replacing content
              // This preserves the original text and keeps it editable
              builder.add(
                widgetPos,
                widgetPos,
                Decoration.widget({
                  widget: new MermaidWidget(mermaidBlockContent.trim(), this.isDarkMode),
                  side: 1 // Place after the position
                })
              );
              
              if (DEBUG_MERMAID) {
                console.log(`[MermaidDiagram] Added Mermaid widget after position ${widgetPos}`);
              }
            }
            
            // Reset tracking variables
            mermaidBlockStart = -1;
            mermaidBlockContent = '';
            mermaidBlockStartLine = -1;
            mermaidBlockEndLine = -1;
          }
        } 
        // If we're inside a Mermaid block, collect the content and mark the line
        else if (inMermaidBlock) {
          mermaidBlockContent += lineText + '\n';
          
          // Add a mark to content lines to identify them as part of a Mermaid block
          builder.add(
            line.from,
            line.to,
            Decoration.mark({
              class: 'cm-mermaid-block-content',
              attributes: { 'data-mermaid-block': 'content', 'data-line': `${i}` }
            })
          );
        }
      }
      
      // Handle unclosed Mermaid blocks
      if (inMermaidBlock && mermaidBlockContent.trim()) {
        if (DEBUG_MERMAID) {
          console.log(`[MermaidDiagram] Found unclosed Mermaid diagram`);
        }
        
        // For unclosed blocks, add the widget at the end of the document
        const widgetPos = doc.length;
        
        // Add a widget decoration at the end instead of replacing content
        builder.add(
          widgetPos,
          widgetPos,
          Decoration.widget({
            widget: new MermaidWidget(mermaidBlockContent.trim(), this.isDarkMode),
            side: 1 // Place after the position
          })
        );
        
        if (DEBUG_MERMAID) {
          console.log(`[MermaidDiagram] Added Mermaid widget for unclosed block at position ${widgetPos}`);
        }
      }
      
      return builder.finish();
    }
  },
  {
    decorations: v => v.decorations
  }
);

/**
 * CSS styles for Mermaid diagrams
 */
const mermaidStyles = EditorView.baseTheme({
  // Hide the mermaid block markers in the editor
  '.cm-mermaid-block-marker': {
    // This will be used by the enhanced-code-fence extension to identify Mermaid blocks
  },
  
  // Style for mermaid block content
  '.cm-mermaid-block-content': {
    // This will be used by the enhanced-code-fence extension to identify Mermaid blocks
  }
});

/**
 * Create the Mermaid diagram extension
 */
export function createMermaidDiagramExtension(): Extension[] {
  return [
    mermaidPlugin,
    mermaidStyles,
  ];
}
