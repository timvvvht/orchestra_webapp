/**
 * Enhanced Code Block Extension for CodeMirror 6
 * Adds copy button and proper styling to code blocks while keeping them editable
 */

import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { RangeSetBuilder, Extension } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';

interface CodeBlockInfo {
  from: number;
  to: number;
  language: string;
  content: string;
  startLine: number;
  endLine: number;
}

class CodeBlockHeaderWidget extends WidgetType {
  constructor(
    private language: string,
    private content: string,
    private view: EditorView
  ) {
    super();
  }

  toDOM(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'cm-code-block-header';
    
    // Language label
    if (this.language) {
      const langLabel = document.createElement('span');
      langLabel.className = 'cm-code-block-language';
      langLabel.textContent = this.language;
      container.appendChild(langLabel);
    }
    
    // Copy button
    const copyButton = document.createElement('button');
    copyButton.className = 'cm-code-block-copy-button';
    copyButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M4 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/>
        <path d="M6 0a2 2 0 0 0-2 2H2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2h6a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H6zm0 1h6a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
      </svg>
    `;
    
    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(this.content);
        copyButton.classList.add('copied');
        copyButton.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
          </svg>
        `;
        setTimeout(() => {
          copyButton.classList.remove('copied');
          copyButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/>
              <path d="M6 0a2 2 0 0 0-2 2H2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2h6a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H6zm0 1h6a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
            </svg>
          `;
        }, 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    });
    
    container.appendChild(copyButton);
    return container;
  }

  eq(other: WidgetType): boolean {
    return other instanceof CodeBlockHeaderWidget && 
           other.content === this.content &&
           other.language === this.language;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

// Line decorations for code blocks
const codeBlockLineDecoration = Decoration.line({ 
  attributes: { class: 'cm-code-block-line' } 
});
const codeBlockStartDecoration = Decoration.line({ 
  attributes: { class: 'cm-code-block-line cm-code-block-start' } 
});
const codeBlockEndDecoration = Decoration.line({ 
  attributes: { class: 'cm-code-block-line cm-code-block-end' } 
});

const codeBlockPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    codeBlocks: CodeBlockInfo[] = [];

    constructor(view: EditorView) {
      this.scanCodeBlocks(view);
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.scanCodeBlocks(update.view);
        this.decorations = this.buildDecorations(update.view);
      }
    }

    scanCodeBlocks(view: EditorView) {
      this.codeBlocks = [];
      const { state } = view;
      
      syntaxTree(state).iterate({
        enter: (node) => {
          // Log to see what nodes we're getting
          if (node.name === 'FencedCode' || node.name === 'CodeBlock') {
            console.log('[CodeBlock] Found code block node:', node.name, 'from:', node.from, 'to:', node.to);
            const from = node.from;
            const to = node.to;
            const text = state.doc.sliceString(from, to);
            
            // Extract language from the first line
            const lines = text.split('\n');
            const firstLine = lines[0];
            const langMatch = firstLine.match(/^```(\w+)?/);
            const language = langMatch?.[1] || '';
            
            // Extract content (remove fence markers)
            const content = lines.slice(1, -1).join('\n');
            
            const startLine = state.doc.lineAt(from).number;
            const endLine = state.doc.lineAt(to).number;
            
            this.codeBlocks.push({
              from,
              to,
              language,
              content,
              startLine,
              endLine
            });
          }
        }
      });
    }

    buildDecorations(view: EditorView): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>();
      const { state } = view;
      
      for (const block of this.codeBlocks) {
        // Add header widget after the opening fence
        const firstLine = state.doc.line(block.startLine);
        const firstLineEnd = firstLine.to;
        
        builder.add(
          firstLineEnd,
          firstLineEnd,
          Decoration.widget({
            widget: new CodeBlockHeaderWidget(block.language, block.content, view),
            side: 1
          })
        );
        
        // Add line decorations for styling
        for (let lineNum = block.startLine; lineNum <= block.endLine; lineNum++) {
          const line = state.doc.line(lineNum);
          
          if (lineNum === block.startLine) {
            builder.add(line.from, line.from, codeBlockStartDecoration);
          } else if (lineNum === block.endLine) {
            builder.add(line.from, line.from, codeBlockEndDecoration);
          } else {
            builder.add(line.from, line.from, codeBlockLineDecoration);
          }
        }
      }
      
      return builder.finish();
    }
  },
  {
    decorations: v => v.decorations
  }
);

// Theme for the code block widget
const codeBlockWidgetTheme = EditorView.baseTheme({
  // Code block line styling
  '.cm-code-block-line': {
    backgroundColor: 'var(--code-background) !important',
    fontFamily: 'var(--font-monospace, monospace) !important',
    fontSize: '0.9em !important',
    lineHeight: '1.6 !important',
    padding: '0 1rem !important',
    borderLeft: '1px solid rgba(122, 162, 247, 0.1) !important',
    borderRight: '1px solid rgba(122, 162, 247, 0.1) !important',
  },
  
  '.cm-code-block-start': {
    borderTop: '1px solid rgba(122, 162, 247, 0.1) !important',
    borderTopLeftRadius: '6px !important',
    borderTopRightRadius: '6px !important',
    paddingTop: '0.5rem !important',
    marginTop: '1rem !important',
    position: 'relative !important',
  },
  
  '.cm-code-block-end': {
    borderBottom: '1px solid rgba(122, 162, 247, 0.1) !important',
    borderBottomLeftRadius: '6px !important',
    borderBottomRightRadius: '6px !important',
    paddingBottom: '0.5rem !important',
    marginBottom: '1rem !important',
  },
  
  // Single line code blocks
  '.cm-code-block-start.cm-code-block-end': {
    borderRadius: '6px !important',
    border: '1px solid rgba(122, 162, 247, 0.1) !important',
  },
  
  // Header widget styling
  '.cm-code-block-header': {
    position: 'absolute',
    top: '0.5rem',
    right: '0.5rem',
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
    zIndex: '10',
  },
  
  '.cm-code-block-language': {
    fontSize: '0.75rem',
    fontWeight: '500',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    padding: '0.25rem 0.5rem',
    backgroundColor: 'rgba(122, 162, 247, 0.1)',
    borderRadius: '4px',
  },
  
  '.cm-code-block-copy-button': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    padding: '0',
    background: 'transparent',
    border: '1px solid rgba(122, 162, 247, 0.2)',
    borderRadius: '4px',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    opacity: '0',
  },
  
  '.cm-code-block-line:hover .cm-code-block-copy-button': {
    opacity: '1',
  },
  
  '.cm-code-block-copy-button:hover': {
    backgroundColor: 'rgba(122, 162, 247, 0.1)',
    borderColor: 'rgba(122, 162, 247, 0.3)',
    color: 'var(--text-normal)',
  },
  
  '.cm-code-block-copy-button.copied': {
    color: 'var(--color-success, #4caf50)',
    opacity: '1',
  },
  
  // Make the first line relative for absolute positioning
  '.cm-code-block-start': {
    position: 'relative',
  }
});

export function createCodeBlockWidgetExtension(): Extension[] {
  return [codeBlockPlugin, codeBlockWidgetTheme];
}