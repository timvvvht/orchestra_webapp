/**
 * Simple Code Block Extension for CodeMirror 6
 * Provides visual styling and copy functionality via keyboard shortcut
 */

import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, keymap } from '@codemirror/view';
import { RangeSetBuilder, StateCommand } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { Extension } from '@codemirror/state';

// Line decorations
const codeBlockContent = Decoration.line({ 
    attributes: { class: 'cm-code-block-content' } 
});
const codeBlockStart = Decoration.line({ 
    attributes: { class: 'cm-code-block-start' } 
});
const codeBlockEnd = Decoration.line({ 
    attributes: { class: 'cm-code-block-end' } 
});

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
        paddingRight: '1rem',
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
    
    // Visual hint for copy functionality
    '.cm-code-block-start::after': {
        content: '"⌘+Shift+C to copy"',
        position: 'absolute',
        top: '0.5rem',
        right: '0.5rem',
        padding: '0.125rem 0.5rem',
        fontSize: '0.7rem',
        fontFamily: 'var(--font-sans, sans-serif)',
        fontWeight: '400',
        color: 'var(--text-muted)',
        opacity: '0.5',
        userSelect: 'none',
    },
    
    '.cm-code-block-start:hover::after': {
        opacity: '0.8',
    },
    
    // Success feedback
    '.cm-editor.code-copied .cm-code-block-start::after': {
        content: '"✓ Copied!"',
        color: 'var(--color-success, #4caf50)',
        opacity: '1',
    },
});

// Command to copy code block at cursor
const copyCodeBlock: StateCommand = (view) => {
    const { state } = view;
    const pos = state.selection.main.head;
    const tree = syntaxTree(state);
    let copied = false;
    
    // Find the code block containing the cursor
    tree.iterate({
        enter: (node) => {
            if ((node.name === 'FencedCode' || node.name === 'CodeBlock') && 
                node.from <= pos && node.to >= pos) {
                
                // Extract content
                const text = state.doc.sliceString(node.from, node.to);
                const lines = text.split('\n');
                const content = lines.slice(1, -1).join('\n');
                
                if (content) {
                    navigator.clipboard.writeText(content).then(() => {
                        // Add visual feedback
                        view.dom.classList.add('code-copied');
                        setTimeout(() => {
                            view.dom.classList.remove('code-copied');
                        }, 2000);
                    }).catch(err => {
                        console.error('Failed to copy:', err);
                    });
                    copied = true;
                }
                
                return false;
            }
        }
    });
    
    return copied;
};

// Keyboard shortcuts
const codeBlockKeymap = keymap.of([
    {
        key: 'Mod-Shift-c',
        run: copyCodeBlock,
    }
]);

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

            // Process visible ranges
            for (const { from, to } of view.visibleRanges) {
                tree.iterate({
                    from,
                    to,
                    enter: (node) => {
                        if (node.name === 'FencedCode' || node.name === 'CodeBlock') {
                            const startPos = node.from;
                            const endPos = node.to;
                            
                            const startLine = state.doc.lineAt(startPos);
                            const endLine = state.doc.lineAt(endPos);
                            
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
    return [codeBlockTheme, codeBlockKeymap, codeBlockPlugin];
}