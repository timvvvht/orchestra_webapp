/**
 * Code Block Extension based on ink-mde's approach
 * Uses line decorations for styling
 */

import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { Extension } from '@codemirror/state';

// Line decorations - these add CSS classes to lines
const codeBlockLine = Decoration.line({ 
    class: 'cm-code-block-line' 
});

// Theme
const codeBlockTheme = EditorView.baseTheme({
    '.cm-code-block-line': {
        backgroundColor: 'var(--code-background, rgba(0, 0, 0, 0.05)) !important',
        fontFamily: 'var(--font-monospace, monospace) !important',
        fontSize: '0.9em !important',
        padding: '2px 16px !important',
        margin: '0 !important',
        borderLeft: '1px solid rgba(122, 162, 247, 0.1) !important',
        borderRight: '1px solid rgba(122, 162, 247, 0.1) !important',
    },
    
    // First line of code block
    '.cm-code-block-line:first-of-type': {
        borderTop: '1px solid rgba(122, 162, 247, 0.1) !important',
        borderTopLeftRadius: '6px !important',
        borderTopRightRadius: '6px !important',
        paddingTop: '8px !important',
        marginTop: '8px !important',
    },
    
    // Last line of code block
    '.cm-code-block-line:last-of-type': {
        borderBottom: '1px solid rgba(122, 162, 247, 0.1) !important',
        borderBottomLeftRadius: '6px !important',
        borderBottomRightRadius: '6px !important',
        paddingBottom: '8px !important',
        marginBottom: '8px !important',
    },
    
    // Single line code blocks
    '.cm-code-block-line:only-of-type': {
        border: '1px solid rgba(122, 162, 247, 0.1) !important',
        borderRadius: '6px !important',
        paddingTop: '8px !important',
        paddingBottom: '8px !important',
    }
});

const codeBlockPlugin = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = this.buildDecorations(view);
        }

        update(update: ViewUpdate) {
            if (update.docChanged || update.viewportChanged || syntaxTree(update.state) !== syntaxTree(update.startState)) {
                this.decorations = this.buildDecorations(update.view);
            }
        }

        buildDecorations(view: EditorView): DecorationSet {
            const builder = new RangeSetBuilder<Decoration>();
            const { state } = view;
            
            // Iterate through the syntax tree
            syntaxTree(state).iterate({
                enter: (node) => {
                    if (node.name === 'FencedCode') {
                        console.log('[CodeBlock] Processing FencedCode from', node.from, 'to', node.to);
                        
                        const startLine = state.doc.lineAt(node.from);
                        const endLine = state.doc.lineAt(node.to);
                        
                        // Apply decoration to each line in the code block
                        for (let line = startLine.number; line <= endLine.number; line++) {
                            const lineObj = state.doc.line(line);
                            console.log('[CodeBlock] Adding decoration to line', line);
                            builder.add(lineObj.from, lineObj.from, codeBlockLine);
                        }
                    }
                }
            });
            
            return builder.finish();
        }
    },
    {
        decorations: v => v.decorations
    }
);

export function createCodeBlockStylingExtension(): Extension[] {
    console.log('[CodeBlock] Creating ink-style extension');
    return [codeBlockTheme, codeBlockPlugin];
}