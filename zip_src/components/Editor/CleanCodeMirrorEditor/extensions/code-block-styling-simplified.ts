/**
 * Simplified Code Block Styling Extension for CodeMirror 6
 * Based on ink-mde's approach - using only line decorations
 * Enhanced with copy button functionality
 */

import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { Extension } from '@codemirror/state';

// Copy button widget
class CopyButtonWidget extends WidgetType {
    constructor(private content: string, private language: string = '') {
        super();
    }

    toDOM(): HTMLElement {
        console.log('[CopyButtonWidget] Creating widget for language:', this.language);
        const container = document.createElement('div');
        container.className = 'code-block-header-widget';
        
        // Language label
        if (this.language) {
            const langLabel = document.createElement('span');
            langLabel.className = 'code-block-language';
            langLabel.textContent = this.language;
            container.appendChild(langLabel);
        }
        
        // Copy button
        const button = document.createElement('button');
        button.className = 'code-block-copy-button';
        button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/>
                <path d="M6 0a2 2 0 0 0-2 2H2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2h6a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H6zm0 1h6a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
            </svg>
        `;
        
        button.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(this.content);
                button.classList.add('copied');
                button.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
                    </svg>
                `;
                setTimeout(() => {
                    button.classList.remove('copied');
                    button.innerHTML = `
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
        
        container.appendChild(button);
        return container;
    }

    eq(other: WidgetType): boolean {
        return other instanceof CopyButtonWidget && 
               other.content === this.content && 
               other.language === this.language;
    }
}

// CSS classes for code blocks
const codeBlockDecoration = Decoration.line({ 
    attributes: { class: 'cm-code-block-content' } 
});
const codeBlockStartDecoration = Decoration.line({ 
    attributes: { class: 'cm-code-block-start' } 
});
const codeBlockEndDecoration = Decoration.line({ 
    attributes: { class: 'cm-code-block-end' } 
});

// Base theme for code blocks
const codeBlockBaseTheme = EditorView.baseTheme({
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
    // Hide the fence markers on non-active lines
    '.cm-line:not(.cm-activeLine) .cm-code-fence-marker': {
        opacity: '0.3',
    },
    // Copy button widget styles
    '.code-block-header-widget': {
        display: 'inline-flex',
        gap: '8px',
        alignItems: 'center',
        marginLeft: '16px',
        opacity: '0',
        transition: 'opacity 0.2s ease',
        verticalAlign: 'middle',
    },
    '.cm-line:hover .code-block-header-widget': {
        opacity: '1',
    },
    '.code-block-language': {
        fontSize: '0.75rem',
        fontWeight: '500',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        padding: '2px 8px',
        backgroundColor: 'rgba(122, 162, 247, 0.1)',
        borderRadius: '3px',
        fontFamily: 'var(--font-sans, sans-serif)',
    },
    '.code-block-copy-button': {
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
    '.code-block-copy-button:hover': {
        backgroundColor: 'rgba(122, 162, 247, 0.1)',
        borderColor: 'rgba(122, 162, 247, 0.3)',
        color: 'var(--text-normal)',
    },
    '.code-block-copy-button.copied': {
        color: 'var(--color-success, #4caf50)',
        borderColor: 'var(--color-success, #4caf50)',
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

            // Store code blocks for widget creation
            const codeBlocks: Array<{from: number, to: number, language: string, content: string}> = [];
            
            // First pass: collect all code blocks
            tree.iterate({
                enter: (node) => {
                    if (node.name === 'FencedCode' || node.name === 'CodeBlock') {
                        console.log('[CodeBlock] Found code block node:', node.name, 'from:', node.from, 'to:', node.to);
                        const text = state.doc.sliceString(node.from, node.to);
                        const lines = text.split('\n');
                        const firstLine = lines[0];
                        const langMatch = firstLine.match(/^```(\w+)?/);
                        const language = langMatch?.[1] || '';
                        const content = lines.slice(1, -1).join('\n');
                        
                        console.log('[CodeBlock] Parsed - language:', language, 'content length:', content.length);
                        
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
                                    console.log('[CodeBlock] Adding copy button widget for block:', blockInfo.language, 'at line:', line.number);
                                    // Add as a replace decoration at the end of the first line
                                    const lineText = state.doc.lineAt(line.from).text;
                                    const fenceEnd = lineText.indexOf('```') + 3;
                                    const langEnd = fenceEnd + (blockInfo.language ? blockInfo.language.length : 0);
                                    
                                    builder.add(
                                        line.from + langEnd,
                                        line.from + langEnd,
                                        Decoration.widget({
                                            widget: new CopyButtonWidget(blockInfo.content, blockInfo.language),
                                            side: 1
                                        })
                                    );
                                }
                                
                                // Add appropriate decoration based on line position
                                if (line.number === startLine.number && line.number === endLine.number) {
                                    // Single-line code block
                                    builder.add(line.from, line.from, codeBlockStartDecoration);
                                    builder.add(line.from, line.from, codeBlockEndDecoration);
                                } else if (line.number === startLine.number) {
                                    // Start of multi-line code block
                                    builder.add(line.from, line.from, codeBlockStartDecoration);
                                } else if (line.number === endLine.number) {
                                    // End of multi-line code block
                                    builder.add(line.from, line.from, codeBlockEndDecoration);
                                } else if (line.number > startLine.number && line.number < endLine.number) {
                                    // Middle of code block
                                    builder.add(line.from, line.from, codeBlockDecoration);
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

export function createCodeBlockStylingExtension(): Extension[] {
    return [codeBlockBaseTheme, codeBlockPlugin];
}