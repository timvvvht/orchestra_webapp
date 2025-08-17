/**
 * Proper Code Block Extension for CodeMirror 6
 * Designed from first principles to create cohesive code blocks
 */

import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { Extension } from '@codemirror/state';

// Line decorations - minimal, just for identification
const codeBlockContent = Decoration.line({ 
    attributes: { class: 'cm-code-block-content' } 
});
const codeBlockStart = Decoration.line({ 
    attributes: { class: 'cm-code-block-start' } 
});
const codeBlockEnd = Decoration.line({ 
    attributes: { class: 'cm-code-block-end' } 
});

// Store code blocks for copy functionality
const codeBlocksMap = new WeakMap<EditorView, Map<number, {content: string, language: string}>>();

// Theme that creates a cohesive code block appearance
const codeBlockTheme = EditorView.baseTheme({
    // Reset line spacing within code blocks
    '.cm-line.cm-code-block-content, .cm-line.cm-code-block-start, .cm-line.cm-code-block-end': {
        padding: '0 !important',
        margin: '0 !important',
    },
    
    // Style for all code block lines
    '.cm-code-block-content, .cm-code-block-start, .cm-code-block-end': {
        backgroundColor: 'var(--code-background, rgba(0, 0, 0, 0.05))',
        fontFamily: 'var(--font-monospace, monospace)',
        fontSize: '0.9em',
        lineHeight: '1.5',
        // Padding on the content, not the line
        paddingLeft: '1rem',
        paddingRight: '3rem', // Extra space for copy button
    },
    
    // First line of code block
    '.cm-code-block-start': {
        borderTop: '1px solid rgba(122, 162, 247, 0.1)',
        borderLeft: '1px solid rgba(122, 162, 247, 0.1)',
        borderRight: '1px solid rgba(122, 162, 247, 0.1)',
        borderTopLeftRadius: '6px',
        borderTopRightRadius: '6px',
        paddingTop: '0.75rem',
        marginTop: '1rem',
        position: 'relative',
    },
    
    // Last line of code block
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
    
    // Copy button container
    '.cm-code-block-copy-btn': {
        position: 'absolute',
        top: '0.5rem',
        right: '0.5rem',
        padding: '0.25rem 0.5rem',
        fontSize: '0.75rem',
        fontFamily: 'var(--font-sans, sans-serif)',
        fontWeight: '500',
        color: 'var(--text-muted)',
        backgroundColor: 'var(--background-primary)',
        border: '1px solid rgba(122, 162, 247, 0.2)',
        borderRadius: '4px',
        cursor: 'pointer',
        opacity: '0',
        transition: 'all 0.2s ease',
        userSelect: 'none',
        zIndex: '100', // Higher z-index
        pointerEvents: 'auto', // Ensure pointer events work
    },
    
    '.cm-code-block-start:hover .cm-code-block-copy-btn': {
        opacity: '1',
    },
    
    '.cm-code-block-copy-btn:hover': {
        backgroundColor: 'rgba(122, 162, 247, 0.1)',
        borderColor: 'rgba(122, 162, 247, 0.3)',
        color: 'var(--text-normal)',
    },
    
    '.cm-code-block-copy-btn.copied': {
        color: 'var(--color-success, #4caf50)',
        borderColor: 'var(--color-success, #4caf50)',
    },
});

const codeBlockPlugin = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet;
        copyButtons: Map<number, HTMLElement> = new Map();

        constructor(view: EditorView) {
            this.decorations = this.buildDecorations(view);
            this.injectCopyButtons(view);
        }

        update(update: ViewUpdate) {
            if (update.docChanged || update.viewportChanged) {
                this.decorations = this.buildDecorations(update.view);
                this.injectCopyButtons(update.view);
            }
        }

        destroy() {
            // Clean up copy buttons
            this.copyButtons.forEach(btn => btn.remove());
            this.copyButtons.clear();
        }

        injectCopyButtons(view: EditorView) {
            // Remove existing buttons
            this.copyButtons.forEach(btn => btn.remove());
            this.copyButtons.clear();

            const blockMap = codeBlocksMap.get(view);
            if (!blockMap) return;

            // Find all code block start lines in the viewport
            view.dom.querySelectorAll('.cm-code-block-start').forEach(lineEl => {
                const lineDiv = lineEl as HTMLElement;
                const pos = view.posAtDOM(lineDiv);
                if (pos === null) return;
                
                const line = view.state.doc.lineAt(pos);
                const blockInfo = blockMap.get(line.number);
                
                if (blockInfo) {
                    // Create copy button
                    const btn = document.createElement('button');
                    btn.className = 'cm-code-block-copy-btn';
                    btn.textContent = 'Copy';
                    // Use mousedown to intercept before CodeMirror's click handling
                    btn.onmousedown = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        navigator.clipboard.writeText(blockInfo.content).then(() => {
                            btn.textContent = '✓ Copied';
                            btn.classList.add('copied');
                            setTimeout(() => {
                                btn.textContent = 'Copy';
                                btn.classList.remove('copied');
                            }, 2000);
                        }).catch(err => {
                            console.error('Failed to copy:', err);
                        });
                        
                        // Prevent the event from reaching CodeMirror
                        return false;
                    };
                    
                    // Also prevent other mouse events from propagating
                    btn.onmouseup = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    };
                    
                    btn.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    };
                    
                    // Inject into the line element
                    lineDiv.style.position = 'relative';
                    lineDiv.appendChild(btn);
                    this.copyButtons.set(line.number, btn);
                }
            });
        }

        buildDecorations(view: EditorView): DecorationSet {
            const builder = new RangeSetBuilder<Decoration>();
            const { state } = view;
            const tree = syntaxTree(state);
            
            // Initialize code blocks map
            const blockMap = new Map<number, {content: string, language: string}>();
            codeBlocksMap.set(view, blockMap);

            // Process each visible range
            for (const { from, to } of view.visibleRanges) {
                tree.iterate({
                    from,
                    to,
                    enter: (node) => {
                        if (node.name === 'FencedCode' || node.name === 'CodeBlock') {
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
                            
                            // Store block info
                            blockMap.set(startLine.number, { content, language });
                            
                            // Apply decorations to each line
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