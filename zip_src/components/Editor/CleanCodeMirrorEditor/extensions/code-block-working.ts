/**
 * Working Code Block Extension for CodeMirror 6
 * Based on the approach that was successfully showing backgrounds
 */

import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { Extension } from '@codemirror/state';

// Widget for copy button
class CopyButtonWidget extends WidgetType {
    constructor(private content: string) {
        super();
    }

    toDOM(): HTMLElement {
        console.log('[CopyButton] Creating button widget');
        const button = document.createElement('button');
        button.className = 'code-block-copy-btn';
        button.textContent = 'Copy';
        button.style.backgroundColor = 'red'; // Make it very visible for debugging
        button.style.color = 'white';
        button.style.padding = '10px';
        button.style.position = 'relative'; // Override absolute for now
        button.style.zIndex = '9999';
        
        button.onmousedown = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            navigator.clipboard.writeText(this.content).then(() => {
                button.textContent = '✓';
                button.style.color = 'var(--color-success, #4caf50)';
                setTimeout(() => {
                    button.textContent = 'Copy';
                    button.style.color = '';
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy:', err);
            });
        };
        
        return button;
    }

    eq(other: WidgetType): boolean {
        return other instanceof CopyButtonWidget && other.content === this.content;
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
        border: '3px solid red !important', // Debug: make it very visible
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
    // Copy button styling
    '.code-block-copy-btn': {
        position: 'absolute',
        top: '8px',
        right: '16px',
        padding: '4px 12px',
        fontSize: '12px',
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
    },
    '.code-block-copy-btn:hover': {
        opacity: '1',
        backgroundColor: 'rgba(122, 162, 247, 0.1)',
        borderColor: 'rgba(122, 162, 247, 0.3)',
        color: 'var(--text-normal)',
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
            console.log('[CodeBlock] Building decorations...');
            const builder = new RangeSetBuilder<Decoration>();
            const { state } = view;
            const tree = syntaxTree(state);

            // Store code blocks for widget creation
            const codeBlocks: Array<{from: number, to: number, content: string}> = [];
            
            // First pass: collect all code blocks
            let nodeTypes = new Set<string>();
            tree.iterate({
                enter: (node) => {
                    nodeTypes.add(node.name);
                    if (node.name === 'FencedCode' || node.name === 'CodeBlock') {
                        console.log('[CodeBlock] Found code block node:', node.name);
                        const text = state.doc.sliceString(node.from, node.to);
                        const lines = text.split('\n');
                        const content = lines.slice(1, -1).join('\n');
                        
                        codeBlocks.push({
                            from: node.from,
                            to: node.to,
                            content
                        });
                    }
                }
            });
            
            console.log('[CodeBlock] All node types found:', Array.from(nodeTypes).sort());
            console.log('[CodeBlock] Total code blocks found:', codeBlocks.length);

            // Process each visible range
            for (const { from, to } of view.visibleRanges) {
                console.log('[CodeBlock] Processing visible range:', from, 'to', to);
                
                // For each code block, check if it overlaps with this visible range
                for (const block of codeBlocks) {
                    // Skip if block is outside visible range
                    if (block.to < from || block.from > to) continue;
                    
                    console.log('[CodeBlock] Processing code block in visible range');
                    
                    const startLine = state.doc.lineAt(block.from);
                    const endLine = state.doc.lineAt(block.to);
                    
                    // Add copy button widget to first line
                    if (block.content) {
                        console.log('[CodeBlock] Adding widget to line', startLine.number, 'content length:', block.content.length);
                        builder.add(
                            startLine.to,
                            startLine.to,
                            Decoration.widget({
                                widget: new CopyButtonWidget(block.content),
                                side: 1
                            })
                        );
                    }
                    
                    // Add line decorations for each line in the code block
                    for (let lineNum = startLine.number; lineNum <= endLine.number; lineNum++) {
                        const line = state.doc.line(lineNum);
                        
                        console.log('[CodeBlock] Adding decoration to line', lineNum);
                        
                        if (lineNum === startLine.number && lineNum === endLine.number) {
                            // Single-line code block
                            builder.add(line.from, line.from, codeBlockStartDecoration);
                            builder.add(line.from, line.from, codeBlockEndDecoration);
                        } else if (lineNum === startLine.number) {
                            // Start of multi-line code block
                            builder.add(line.from, line.from, codeBlockStartDecoration);
                        } else if (lineNum === endLine.number) {
                            // End of multi-line code block
                            builder.add(line.from, line.from, codeBlockEndDecoration);
                        } else {
                            // Middle of code block
                            builder.add(line.from, line.from, codeBlockDecoration);
                        }
                    }
                }
            }

            return builder.finish();
        }
    },
    { decorations: v => v.decorations }
);

export function createCodeBlockStylingExtension(): Extension[] {
    console.log('[CodeBlock] Extension being created!');
    return [codeBlockBaseTheme, codeBlockPlugin];
}