/**
 * Final Code Block Extension for CodeMirror 6
 * Uses CodeMirror's event handling system properly
 */

import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { Extension } from '@codemirror/state';

// Line decorations
const codeBlockContent = Decoration.line({ 
    attributes: { class: 'cm-code-block-content' } 
});
const codeBlockStart = Decoration.line({ 
    attributes: { class: 'cm-code-block-start', 'data-code-block': 'start' } 
});
const codeBlockEnd = Decoration.line({ 
    attributes: { class: 'cm-code-block-end' } 
});

// Store code blocks for copy functionality
const codeBlocksMap = new WeakMap<EditorView, Map<number, {content: string, language: string}>>();

// Theme for cohesive code blocks
const codeBlockTheme = EditorView.baseTheme({
    // Reset line spacing
    '.cm-line.cm-code-block-content, .cm-line.cm-code-block-start, .cm-line.cm-code-block-end': {
        padding: '0 !important',
        margin: '0 !important',
    },
    
    // Base styling for all code block lines
    '.cm-code-block-content, .cm-code-block-start, .cm-code-block-end': {
        backgroundColor: 'var(--code-background, rgba(0, 0, 0, 0.05))',
        fontFamily: 'var(--font-monospace, monospace)',
        fontSize: '0.9em',
        lineHeight: '1.5',
        paddingLeft: '1rem',
        paddingRight: '4rem', // Space for copy button
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
        position: 'relative',
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
    
    // Copy button area (visual indicator) - always visible
    '.cm-code-block-start::after': {
        content: '"Copy"',
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
        opacity: '0.7', // Always visible but subtle
        transition: 'all 0.2s ease',
        pointerEvents: 'none',
        userSelect: 'none',
    },
    
    '.cm-code-block-start:hover::after': {
        opacity: '1',
        backgroundColor: 'rgba(122, 162, 247, 0.1)',
        borderColor: 'rgba(122, 162, 247, 0.3)',
    },
    
    '.cm-code-block-start.copying::after': {
        content: '"✓ Copied"',
        color: 'var(--color-success, #4caf50)',
        borderColor: 'var(--color-success, #4caf50)',
        opacity: '1',
    },
});

// DOM event handler extension
const codeBlockDOMEvents = EditorView.domEventHandlers({
    mousedown(event, view) {
        const target = event.target as HTMLElement;
        const lineEl = target.closest('.cm-line');
        
        // Debug logging
        console.log('[CodeBlock] Mousedown event', {
            target: target.className,
            lineEl: lineEl?.className,
            lineElClasses: lineEl ? Array.from(lineEl.classList) : [],
            hasCodeBlockStart: lineEl?.classList.contains('cm-code-block-start')
        });
        
        // Check if this line has code block start decoration
        // The class might be on the line or we need to check attributes
        const isCodeBlockStart = lineEl && (
            lineEl.classList.contains('cm-code-block-start') ||
            lineEl.querySelector('.cm-code-block-start') ||
            lineEl.hasAttribute('data-code-block')
        );
        
        if (!isCodeBlockStart) {
            return false;
        }
        
        // Check if click is in the copy button area
        const rect = lineEl.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        console.log('[CodeBlock] Click position', {
            x, y,
            rectWidth: rect.width,
            rectHeight: rect.height,
            isInButtonArea: x > rect.width - 120 && y < 50
        });
        
        // Copy button is in top-right corner (more generous area)
        if (x > rect.width - 120 && y < 50) {
            event.preventDefault();
            event.stopPropagation();
            
            console.log('[CodeBlock] Copy button clicked!');
            
            // Get line number
            const pos = view.posAtDOM(lineEl);
            const line = view.state.doc.lineAt(pos);
            
            // Get code block content
            const blockMap = codeBlocksMap.get(view);
            const blockInfo = blockMap?.get(line.number);
            
            console.log('[CodeBlock] Block info', {
                lineNumber: line.number,
                hasBlockInfo: !!blockInfo,
                contentLength: blockInfo?.content.length
            });
            
            if (blockInfo && blockInfo.content) {
                // Copy to clipboard
                navigator.clipboard.writeText(blockInfo.content).then(() => {
                    console.log('[CodeBlock] Copied successfully!');
                    // Add visual feedback
                    lineEl.classList.add('copying');
                    setTimeout(() => {
                        lineEl.classList.remove('copying');
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy:', err);
                });
            }
            
            return true; // Prevent default CodeMirror handling
        }
        
        return false;
    },
    
    // Also handle click event
    click(event, view) {
        const target = event.target as HTMLElement;
        const lineEl = target.closest('.cm-line');
        
        if (!lineEl || !lineEl.classList.contains('cm-code-block-start')) {
            return false;
        }
        
        const rect = lineEl.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // If in button area, prevent default
        if (x > rect.width - 120 && y < 50) {
            event.preventDefault();
            event.stopPropagation();
            return true;
        }
        
        return false;
    }
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
            
            // Initialize code blocks map
            const blockMap = new Map<number, {content: string, language: string}>();
            codeBlocksMap.set(view, blockMap);

            // Process visible ranges
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
                            
                            // Apply decorations
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
    return [codeBlockTheme, codeBlockDOMEvents, codeBlockPlugin];
}