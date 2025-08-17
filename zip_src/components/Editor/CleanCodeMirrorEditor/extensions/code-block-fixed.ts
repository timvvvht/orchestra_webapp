/**
 * Fixed Code Block Extension for CodeMirror 6
 * Combines simple line decorations for styling with minimal widget for copy button
 * Maintains full editability while providing enhanced UX
 */

import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { Extension } from '@codemirror/state';

// Minimal copy button widget - only appears on hover
class CopyButtonWidget extends WidgetType {
    constructor(private content: string, private language: string = '') {
        super();
    }

    toDOM(): HTMLElement {
        const container = document.createElement('div');
        container.className = 'cm-code-block-actions';
        
        // Language label
        if (this.language) {
            const langLabel = document.createElement('span');
            langLabel.className = 'cm-code-block-language';
            langLabel.textContent = this.language;
            container.appendChild(langLabel);
        }
        
        // Copy button
        const button = document.createElement('button');
        button.className = 'cm-code-block-copy';
        button.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/>
                <path d="M6 0a2 2 0 0 0-2 2H2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2h6a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H6zm0 1h6a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
            </svg>
        `;
        
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
                await navigator.clipboard.writeText(this.content);
                button.classList.add('copied');
                button.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
                    </svg>
                `;
                setTimeout(() => {
                    button.classList.remove('copied');
                    button.innerHTML = `
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M4 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/>
                            <path d="M6 0a2 2 0 0 0-2 2H2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2h6a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H6zm0 1h6a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
                        </svg>
                    `;
                }, 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        });
        
        container.appendChild(button);
        return container;
    }

    eq(other: WidgetType): boolean {
        return other instanceof CopyButtonWidget && 
               other.content === this.content && 
               other.language === this.language;
    }

    ignoreEvent(): boolean {
        return false;
    }
}

// Line decorations for code block styling
const codeBlockLine = Decoration.line({ 
    attributes: { class: 'cm-code-block-content' } 
});
const codeBlockStart = Decoration.line({ 
    attributes: { class: 'cm-code-block-start' } 
});
const codeBlockEnd = Decoration.line({ 
    attributes: { class: 'cm-code-block-end' } 
});
const codeBlockSingle = Decoration.line({ 
    attributes: { class: 'cm-code-block-start cm-code-block-end' } 
});

// CSS theme for code blocks
const codeBlockTheme = EditorView.baseTheme({
    // Base code block styling - matching what tokyo-night.css expects
    '.cm-code-block-content': {
        backgroundColor: 'var(--code-background, rgba(0, 0, 0, 0.05))',
        fontFamily: 'var(--font-monospace, monospace)',
        padding: '0 16px',
    },
    
    '.cm-code-block-start': {
        backgroundColor: 'var(--code-background, rgba(0, 0, 0, 0.05))',
        fontFamily: 'var(--font-monospace, monospace)',
        borderTopLeftRadius: '6px',
        borderTopRightRadius: '6px',
        paddingTop: '8px',
        paddingLeft: '16px',
        paddingRight: '16px',
        marginTop: '8px',
        position: 'relative',
    },
    
    '.cm-code-block-end': {
        backgroundColor: 'var(--code-background, rgba(0, 0, 0, 0.05))',
        fontFamily: 'var(--font-monospace, monospace)',
        borderBottomLeftRadius: '6px',
        borderBottomRightRadius: '6px',
        paddingBottom: '8px',
        paddingLeft: '16px',
        paddingRight: '16px',
        marginBottom: '8px',
    },
    
    // Combined class for single-line code blocks
    '.cm-code-block-start.cm-code-block-end': {
        borderRadius: '6px',
        paddingTop: '8px',
        paddingBottom: '8px',
    },
    
    // Actions container (language + copy button)
    '.cm-code-block-actions': {
        position: 'absolute',
        top: '0.5rem',
        right: '0.5rem',
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
        opacity: '0',
        transition: 'opacity 0.2s ease',
    },
    
    '.cm-code-block-start:hover .cm-code-block-actions': {
        opacity: '1',
    },
    
    '.cm-code-block-language': {
        fontSize: '0.75rem',
        fontWeight: '500',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        padding: '0.125rem 0.5rem',
        backgroundColor: 'rgba(122, 162, 247, 0.1)',
        borderRadius: '3px',
        fontFamily: 'var(--font-sans, sans-serif)',
    },
    
    '.cm-code-block-copy': {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '28px',
        height: '28px',
        padding: '0',
        background: 'transparent',
        border: '1px solid rgba(122, 162, 247, 0.2)',
        borderRadius: '4px',
        color: 'var(--text-muted)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },
    
    '.cm-code-block-copy:hover': {
        backgroundColor: 'rgba(122, 162, 247, 0.1)',
        borderColor: 'rgba(122, 162, 247, 0.3)',
        color: 'var(--text-normal)',
    },
    
    '.cm-code-block-copy.copied': {
        color: 'var(--color-success, #4caf50)',
        borderColor: 'var(--color-success, #4caf50)',
    },
    
    // Hide fence markers on inactive lines
    '.cm-line:not(.cm-activeLine) .cm-code-fence-marker': {
        opacity: '0.3',
    },
});

const codeBlockPlugin = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = this.buildDecorations(view);
        }

        update(update: ViewUpdate) {
            if (update.docChanged || update.viewportChanged) {
                this.decorations = this.buildDecorations(update.view);
            }
        }

        buildDecorations(view: EditorView): DecorationSet {
            const builder = new RangeSetBuilder<Decoration>();
            const { state } = view;
            const tree = syntaxTree(state);
            
            // Store code block info for widgets
            const codeBlocks: Array<{from: number, to: number, language: string, content: string}> = [];
            
            // First pass: collect all code blocks in the document
            tree.iterate({
                enter: (node) => {
                    // Log all node types to debug
                    if (node.name.includes('Code') || node.name.includes('code')) {
                        console.log('[CodeBlockFixed] Found code-related node:', node.name, 'from:', node.from, 'to:', node.to);
                    }
                    if (node.name === 'FencedCode' || node.name === 'CodeBlock') {
                        const text = state.doc.sliceString(node.from, node.to);
                        const lines = text.split('\n');
                        const firstLine = lines[0];
                        const langMatch = firstLine.match(/^```(\w+)?/);
                        const language = langMatch?.[1] || '';
                        const content = lines.slice(1, -1).join('\n');
                        
                        codeBlocks.push({
                            from: node.from,
                            to: node.to,
                            language,
                            content
                        });
                    }
                }
            });
            
            // Process each visible range
            for (const { from, to } of view.visibleRanges) {
                // Process line by line to ensure correct ordering
                for (let pos = from; pos < to;) {
                    const line = state.doc.lineAt(pos);
                    
                    // Check if this line is part of a code block
                    tree.iterate({
                        from: line.from,
                        to: line.to,
                        enter: (node) => {
                            if (node.name === 'FencedCode' || node.name === 'CodeBlock') {
                                const startLine = state.doc.lineAt(node.from);
                                const endLine = state.doc.lineAt(node.to);
                                
                                // Find the code block info
                                const blockInfo = codeBlocks.find(b => b.from === node.from && b.to === node.to);
                                
                                // Add copy button widget to first line
                                if (line.number === startLine.number && blockInfo && blockInfo.content) {
                                    builder.add(
                                        line.to,
                                        line.to,
                                        Decoration.widget({
                                            widget: new CopyButtonWidget(blockInfo.content, blockInfo.language),
                                            side: 1
                                        })
                                    );
                                }
                                
                                // Add appropriate decoration based on line position
                                if (line.number === startLine.number && line.number === endLine.number) {
                                    // Single-line code block
                                    builder.add(line.from, line.from, codeBlockSingle);
                                } else if (line.number === startLine.number) {
                                    // Start of multi-line code block
                                    builder.add(line.from, line.from, codeBlockStart);
                                } else if (line.number === endLine.number) {
                                    // End of multi-line code block
                                    builder.add(line.from, line.from, codeBlockEnd);
                                } else if (line.number > startLine.number && line.number < endLine.number) {
                                    // Middle of code block
                                    builder.add(line.from, line.from, codeBlockLine);
                                }
                                
                                return false; // Don't descend into children
                            }
                            return true;
                        }
                    });
                    
                    pos = line.to + 1;
                }
            }
            
            return builder.finish();
        }
    },
    { decorations: v => v.decorations }
);

export function createCodeBlockExtension(): Extension[] {
    return [codeBlockTheme, codeBlockPlugin];
}