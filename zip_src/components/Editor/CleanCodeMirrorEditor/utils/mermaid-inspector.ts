/**
 * Mermaid Diagram Inspector
 * 
 * This utility helps debug Mermaid diagram rendering issues by providing
 * detailed information about the current state of Mermaid diagrams in the editor.
 */

import { EditorView } from '@codemirror/view';

export class MermaidInspector {
  private view: EditorView | null = null;
  
  constructor() {
    // Initialize
  }
  
  setView(view: EditorView): void {
    this.view = view;
  }
  
  /**
   * Inspect the current state of Mermaid diagrams in the editor
   */
  inspect(): void {
    if (!this.view) {
      console.warn('[MermaidInspector] No editor view available');
      return;
    }
    
    const doc = this.view.state.doc;
    const mermaidBlocks: Array<{
      startLine: number;
      endLine: number;
      content: string;
      hasWidget: boolean;
    }> = [];
    
    // Find all Mermaid blocks in the document
    let inMermaidBlock = false;
    let startLine = -1;
    let content = '';
    
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
            startLine = i;
            content = '';
          }
        } 
        // Check if this is the end of a Mermaid block
        else {
          inMermaidBlock = false;
          
          // Check if there's a widget after this line
          const lineElement = this.view.dom.querySelector(`.cm-line:nth-child(${i})`);
          const nextElement = lineElement?.nextElementSibling;
          const hasWidget = nextElement?.classList.contains('mermaid-diagram-container') || false;
          
          mermaidBlocks.push({
            startLine,
            endLine: i,
            content,
            hasWidget
          });
          
          // Reset tracking variables
          startLine = -1;
          content = '';
        }
      } 
      // If we're inside a Mermaid block, collect the content
      else if (inMermaidBlock) {
        content += lineText + '\n';
      }
    }
    
    // Handle unclosed Mermaid blocks
    if (inMermaidBlock) {
      mermaidBlocks.push({
        startLine,
        endLine: -1,
        content,
        hasWidget: false
      });
    }
    
    // Log the results
    console.group('[MermaidInspector] Inspection Results');
    console.log(`Found ${mermaidBlocks.length} Mermaid blocks`);
    
    mermaidBlocks.forEach((block, index) => {
      console.group(`Block #${index + 1}`);
      console.log(`Lines: ${block.startLine} - ${block.endLine === -1 ? 'EOF' : block.endLine}`);
      console.log(`Has Widget: ${block.hasWidget}`);
      console.log(`Content (first 100 chars): ${block.content.substring(0, 100)}${block.content.length > 100 ? '...' : ''}`);
      
      // Check for potential issues
      if (!block.hasWidget) {
        console.warn('⚠️ No widget found for this block');
      }
      
      if (block.endLine === -1) {
        console.warn('⚠️ Unclosed block');
      }
      
      if (block.content.trim() === '') {
        console.warn('⚠️ Empty content');
      }
      
      console.groupEnd();
    });
    
    // Check for decoration conflicts
    const mermaidMarkers = this.view.dom.querySelectorAll('.cm-mermaid-block-marker');
    const codeBlockMarkers = this.view.dom.querySelectorAll('.cm-code-block-start, .cm-code-block-content, .cm-code-block-end');
    
    console.log(`Mermaid markers: ${mermaidMarkers.length}`);
    console.log(`Code block markers: ${codeBlockMarkers.length}`);
    
    // Check for overlapping markers
    const overlappingLines: number[] = [];
    
    mermaidMarkers.forEach(marker => {
      const line = marker.closest('.cm-line');
      if (!line) return;
      
      const lineIndex = Array.from(this.view!.dom.querySelectorAll('.cm-line')).indexOf(line);
      
      if (line.querySelector('.cm-code-block-start, .cm-code-block-content, .cm-code-block-end')) {
        overlappingLines.push(lineIndex + 1);
      }
    });
    
    if (overlappingLines.length > 0) {
      console.warn(`⚠️ Found ${overlappingLines.length} lines with overlapping markers: ${overlappingLines.join(', ')}`);
    } else {
      console.log('✅ No overlapping markers found');
    }
    
    console.groupEnd();
  }
}

// Export a singleton instance
export const mermaidInspector = new MermaidInspector();
