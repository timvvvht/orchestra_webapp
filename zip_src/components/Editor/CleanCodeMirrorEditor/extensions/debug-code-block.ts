/**
 * Debug Code Block Extension
 * 
 * Development-only plugin that warns if the container class is missing.
 * This helps debug styling issues with code blocks.
 */

import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { Extension } from '@codemirror/state';

/**
 * Debug plugin that checks for proper code block container classes
 */
const _debugPlugin = ViewPlugin.fromClass(
    class {
        constructor(view: EditorView) {
            this.checkCodeBlocks(view);
        }

        update(update: ViewUpdate) {
            if (update.docChanged || update.viewportChanged) {
                this.checkCodeBlocks(update.view);
            }
        }

        checkCodeBlocks(view: EditorView) {
            // Check for code block containers after a short delay to allow decorations to apply
            setTimeout(() => {
                const containers = view.dom.querySelectorAll('.cm-fenced-code-background');
                const copyButtons = view.dom.querySelectorAll('.cm-code-copy');
                
                if (containers.length === 0 && copyButtons.length > 0) {
                    console.warn('[debug-code-block] Copy buttons found but no .cm-fenced-code-background containers detected. Code block styling may not be working properly.');
                }

                containers.forEach((container, index) => {
                    const lines = container.querySelectorAll('.cm-line');
                    if (lines.length === 0) {
                        console.warn(`[debug-code-block] Container ${index} has no .cm-line elements. Background styling may not appear.`);
                    } else {
                        console.debug(`[debug-code-block] Container ${index} has ${lines.length} lines with proper structure.`);
                    }
                });
            }, 100);
        }
    }
);

/**
 * Creates the debug code block extension with environment gating
 */
export default function debugCodeBlock(): Extension[] {
    return import.meta.env?.MODE !== 'production' && import.meta.env?.VITE_DEBUG_CODE_BLOCK !== 'false'
        ? [_debugPlugin]
        : [];
}