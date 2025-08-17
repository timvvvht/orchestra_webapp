/**
 * Obsidian-style Code Block Extension for CodeMirror 6
 * Implements clickable copy buttons like Obsidian does
 */

import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { Extension } from '@codemirror/state';

// Widget for the copy button - this creates a real DOM element
class CopyButtonWidget extends WidgetType {
    constructor(private content: string, private language: string = '') {
        super();
    }

    toDOM(view: EditorView): HTMLElement {
        console.log('[CopyButtonWidget] Creating button DOM element');
        const button = document.createElement('button');
        button.className = 'cm-code-block-copy-button';
        button.textContent = 'Copy';
        button.setAttribute('aria-label', 'Copy code');
        
        // Important: stop propagation at capture phase
        button.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Copy the content
            navigator.clipboard.writeText(this.content).then(() => {
                button.textContent = '✓ Copied';
                button.classList.add('copied');
                
                setTimeout(() => {
                    button.textContent = 'Copy';
                    button.classList.remove('copied');
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy:', err);
                button.textContent = 'Error';
                setTimeout(() => {
                    button.textContent = 'Copy';
                }, 2000);
            });
        }, true); // Use capture phase
        
        // Prevent all other events from bubbling
        button.addEventListener('click', e => { e.stopPropagation(); });
        button.addEventListener('mouseup', e => { e.stopPropagation(); });
        
        return button;
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

// Line decorations for styling
const codeBlockContent = Decoration.line({ 
    attributes: { class: 'cm-code-block-content' } 
});
const codeBlockStart = Decoration.line({ 
    attributes: { class: 'cm-code-block-start' } 
});
const codeBlockEnd = Decoration.line({ 
    attributes: { class: 'cm-code-block-end' } 
});

// Theme for code blocks
const codeBlockTheme = EditorView.baseTheme({
    // Container for proper layout
    '.cm-line': {
        position: 'relative',
    },
    
    // Reset line spacing within code blocks
    '.cm-line.cm-code-block-content, .cm-line.cm-code-block-start, .cm-line.cm-code-block-end': {
        padding: '0 !important',
        margin: '0 !important',
    },
    
    // Base styling
    '.cm-code-block-content, .cm-code-block-start, .cm-code-block-end': {
        backgroundColor: 'var(--code-background, rgba(0, 0, 0, 0.05))',
        fontFamily: 'var(--font-monospace, monospace)',
        fontSize: '0.9em',
        lineHeight: '1.5',
        paddingLeft: '1rem',
        paddingRight: '4rem', // Space for button
    },
    
    // First line
    '.cm-code-block-start': {
        borderTop: '1px solid rgba(122, 162, 247, 0.1)',
        borderLeft: '1px solid rgba(122, 162, 247, 0.1)',
        borderRight: '1px solid rgba(122, 162, 247, 0.1)',
        borderTopLeftRadius: '6px',
        borderTopRightRadius: '6px',
        paddingTop: '0.75rem',
        marginTop: '1rem',
    },
    
    // Last line
    '.cm-code-block-end': {
        borderBottom: '1px solid rgba(122, 162, 247, 0.1)',
        borderLeft: '1px solid rgba(122, 162, 247, 0.1)',
        borderRight: '1px solid rgba(122, 162, 247, 0.1)',
        borderBottomLeftRadius: '6px',
        borderBottomRightRadius: '6px',
        paddingBottom: '0.75rem',
        marginBottom: '1rem',
    },
    
    // Middle lines
    '.cm-code-block-content:not(.cm-code-block-start):not(.cm-code-block-end)': {
        borderLeft: '1px solid rgba(122, 162, 247, 0.1)',
        borderRight: '1px solid rgba(122, 162, 247, 0.1)',
    },
    
    // Single line code blocks
    '.cm-code-block-start.cm-code-block-end': {
        border: '1px solid rgba(122, 162, 247, 0.1)',
        borderRadius: '6px',
    },
    
    // Copy button styling
    '.cm-code-block-copy-button': {
        position: 'absolute',
        top: '0.5rem',
        right: '0.5rem',
        padding: '0.25rem 0.75rem',
        fontSize: '0.75rem',
        fontFamily: 'var(--font-sans, sans-serif)',
        fontWeight: '500',
        color: 'var(--text-muted)',
        backgroundColor: 'var(--background-primary)',
        border: '1px solid rgba(122, 162, 247, 0.2)',
        borderRadius: '4px',
        cursor: 'pointer',
        opacity: '0.7',
        transition: 'all 0.2s ease',
        zIndex: '10',
        userSelect: 'none',
        // Ensure the button is above content
        pointerEvents: 'auto',
    },
    
    '.cm-code-block-copy-button:hover': {
        opacity: '1',
        backgroundColor: 'rgba(122, 162, 247, 0.1)',
        borderColor: 'rgba(122, 162, 247, 0.3)',
        color: 'var(--text-normal)',
    },
    
    '.cm-code-block-copy-button.copied': {
        color: 'var(--color-success, #4caf50)',
        borderColor: 'var(--color-success, #4caf50)',
        opacity: '1',
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

            console.log('[CodeBlock] Building decorations');

            // First, let's check the entire document for code blocks
            let codeBlockCount = 0;
            tree.iterate({
                enter: (node) => {
                    if (node.name === 'FencedCode' || node.name === 'CodeBlock') {
                        codeBlockCount++;
                    }
                }
            });
            console.log('[CodeBlock] Total code blocks in document:', codeBlockCount);

            // Process visible ranges
            for (const { from, to } of view.visibleRanges) {
                tree.iterate({
                    from,
                    to,
                    enter: (node) => {
                        // Only log code-related nodes
                        if (node.name.toLowerCase().includes('code') || node.name.toLowerCase().includes('fence')) {
                            console.log('[CodeBlock] Code-related node:', node.name, 'from:', node.from, 'to:', node.to);
                        }
                        if (node.name === 'FencedCode' || node.name === 'CodeBlock') {
                            console.log('[CodeBlock] Found code block!');
                            const startPos = node.from;
                            const endPos = node.to;
                            
                            // Extract content
                            const text = state.doc.sliceString(startPos, endPos);
                            const lines = text.split('\n');
                            const firstLine = lines[0];
                            const langMatch = firstLine.match(/^```(\w+)?/);
                            const language = langMatch?.[1] || '';
                            const content = lines.slice(1, -1).join('\n');
                            
                            const startLine = state.doc.lineAt(startPos);
                            const endLine = state.doc.lineAt(endPos);
                            
                            // Add copy button widget to the first line
                            if (content) {
                                console.log('[CodeBlock] Adding widget for language:', language, 'content length:', content.length);
                                // Place the widget at the end of the first line
                                builder.add(
                                    startLine.to,
                                    startLine.to,
                                    Decoration.widget({
                                        widget: new CopyButtonWidget(content, language),
                                        side: 1,
                                    })
                                );
                            } else {
                                console.log('[CodeBlock] No content found for code block');
                            }
                            
                            // Apply line decorations
                            for (let lineNum = startLine.number; lineNum <= endLine.number; lineNum++) {
                                const line = state.doc.line(lineNum);
                                
                                if (lineNum === startLine.number && lineNum === endLine.number) {
                                    // Single line code block
                                    builder.add(line.from, line.from, codeBlockStart);
                                    builder.add(line.from, line.from, codeBlockEnd);
                                } else if (lineNum === startLine.number) {
                                    builder.add(line.from, line.from, codeBlockStart);
                                } else if (lineNum === endLine.number) {
                                    builder.add(line.from, line.from, codeBlockEnd);
                                } else {
                                    builder.add(line.from, line.from, codeBlockContent);
                                }
                            }
                        }
                    }
                });
            }

            return builder.finish();
        }
    },
    {
        decorations: v => v.decorations
    }
);

export function createCodeBlockStylingExtension(): Extension[] {
    return [codeBlockTheme, codeBlockPlugin];
}