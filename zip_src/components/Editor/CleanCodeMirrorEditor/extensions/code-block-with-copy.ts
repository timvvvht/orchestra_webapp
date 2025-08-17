/**
 * CodeMirror 6 Code Block Extension with Always-Visible Copy Button
 *
 * This extension provides:
 * - Styled fenced code blocks with rounded corners
 * - Always-visible copy button that copies block content to clipboard
 * - Support for light and dark themes
 * - Performance optimized for large documents
 */

import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';

// Test-only timing capture for performance monitoring
export const __codeBlockTiming = { lastDecorateMs: 0 };
import { RangeSetBuilder } from '@codemirror/state';
import { codeBlockDebugLog } from '../utils/devLogger';
import { syntaxTree } from '@codemirror/language';
import { Extension } from '@codemirror/state';

/**
 * Copy Button Widget - Creates a clickable copy button
 */
class CopyButtonWidget extends WidgetType {
    constructor(private content: string) {
        super();
    }

    eq(other: CopyButtonWidget): boolean {
        return this.content === other.content;
    }

    toDOM(): HTMLElement {
        const button = document.createElement('button');
        button.className = 'cm-code-copy';
        button.textContent = 'Copy';
        button.type = 'button';

        button.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();

            navigator.clipboard
                .writeText(this.content)
                .then(() => {
                    const originalText = button.textContent;
                    button.textContent = 'Copied!';
                    setTimeout(() => {
                        button.textContent = originalText;
                    }, 2000);
                })
                .catch(err => {
                    console.error('Failed to copy code:', err);
                    const originalText = button.textContent;
                    button.textContent = 'Error';
                    setTimeout(() => {
                        button.textContent = originalText;
                    }, 2000);
                });
        });

        return button;
    }

    ignoreEvent(): boolean {
        return false; // Allow click events to reach the button
    }
}

// Line decorations for code block styling




/**
 * Base theme embedded in the extension
 */
const codeBlockTheme = EditorView.baseTheme({
    // Use the classes applied by the JS logic
    '.cm-line.cm-fenced-code-background': {
        backgroundColor: 'var(--code-background, rgba(32, 35, 48, 0.6))', // Use a distinct variable or ensure --code-background is set
        fontFamily: 'var(--font-monospace, monospace)',
        fontSize: '.9em',
        // Explicitly set all padding properties
        paddingTop: '0px !important',    // More forceful for testing
        paddingBottom: '0px !important', // More forceful for testing
        paddingLeft: '16px',
        paddingRight: '16px',
        marginTop: '0px !important',     // More forceful for testing
        marginBottom: '0px !important',  // More forceful for testing
        border: 'none !important',       // Ensure no borders contribute to spacing
        borderRadius: '0',
        lineHeight: '1.2 !important', // REDUCE LINE HEIGHT and add !important for diagnosis
        position: 'relative', // Context for potential per-line widgets if any, though copy button is on first line
    },
    // NEW DIAGNOSTIC RULE:
    '.cm-line.cm-fenced-code-background + .cm-line.cm-fenced-code-background': {
        marginTop: '0px !important', // Force no margin between consecutive code block lines
    },
    '.cm-line.cm-fenced-code-first-line': { // Make selector more specific
        paddingTop: '8px', // Overall block top padding
        borderTopLeftRadius: '6px',
        borderTopRightRadius: '6px',
        marginTop: '8px', // If a margin is desired for the whole block
        position: 'relative', // Crucial: Positioning context for the copy button
         // Apply borders if they are for the whole block outline
        borderTop: '1px solid var(--background-modifier-border, #2e334f)',
        borderLeft: '1px solid var(--background-modifier-border, #2e334f)',
        borderRight: '1px solid var(--background-modifier-border, #2e334f)',
    },
    '.cm-line.cm-fenced-code-last-line': { // Make selector more specific
        paddingBottom: '8px', // Overall block bottom padding
        borderBottomLeftRadius: '6px',
        borderBottomRightRadius: '6px',
        marginBottom: '8px', // If a margin is desired for the whole block
         // Apply borders if they are for the whole block outline
        borderBottom: '1px solid var(--background-modifier-border, #2e334f)',
        borderLeft: '1px solid var(--background-modifier-border, #2e334f)',
        borderRight: '1px solid var(--background-modifier-border, #2e334f)',
    },
    // Middle lines (if they need different side borders than first/last)
    '.cm-line.cm-fenced-code-background:not(.cm-fenced-code-first-line):not(.cm-fenced-code-last-line)': {
        borderLeft: '1px solid var(--background-modifier-border, #2e334f)',
        borderRight: '1px solid var(--background-modifier-border, #2e334f)',
    },
    '.cm-code-copy': {
        position: 'absolute',
        right: '4px', // Adjusted for potentially smaller padding
        top: '4px',   // Adjusted for potentially smaller padding
        fontSize: '.75em',
        backgroundColor: 'var(--background-secondary, #24283b)', // Give it some background
        color: 'var(--text-muted, #565f89)',
        border: '1px solid var(--background-modifier-border, #2e334f)',
        borderRadius: '3px',
        padding: '1px 6px', // Slightly smaller padding
        cursor: 'pointer',
        opacity: '0.6', // Default opacity
        zIndex: '10', // Ensure it's above other line content
        transition: 'opacity 0.2s ease-in-out, background-color 0.2s ease-in-out',
    },
    '.cm-code-copy:hover, .cm-code-copy:focus': {
        opacity: '1',
        backgroundColor: 'var(--background-modifier-hover, #2e334f)',
        color: 'var(--text-normal, #c0caf5)',
    }
});

/**
 * Main plugin that handles code block detection and decoration
 */
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
            // Capture timing for performance testing (test mode only)
            codeBlockDebugLog('RangeSetBuilder constructor/type:', RangeSetBuilder);
            const t0 = import.meta.env?.MODE === 'test' ? performance.now() : 0;
            codeBlockDebugLog('buildDecorations called. Visible ranges:', view.visibleRanges.map(r => ({from: r.from, to: r.to })));
            let foundCodeBlockNode = false;
            
            // const builder = new RangeSetBuilder<Decoration>();
            // console.log('[CodeBlockDebug] Initialized builder object:', builder);
            // if (typeof builder.size !== 'number') {
            //     console.warn('[CodeBlockDebug] WARNING: Initial builder.size is not a number (type is ' + typeof builder.size + '):', builder.size);
            // }
            const decorationsArray: ReturnType<typeof Decoration.line>[] = [];
            const { state } = view;
            const tree = syntaxTree(state);

            // Process only visible ranges for performance
            for (const { from, to } of view.visibleRanges) {
                tree.iterate({
                    from,
                    to,
                    enter: node => {
                        codeBlockDebugLog(`Iterating syntax tree node: ${node.name} [${node.from}-${node.to}]`);
                        if (node.name === 'FencedCode') {
                            const startDocLine = state.doc.lineAt(node.from); // Moved Up
                            const endDocLine = state.doc.lineAt(node.to);     // Moved Up

                            codeBlockDebugLog('[code-block-with-copy] decorating fenced code from', node.from, 'to', node.to);
                            foundCodeBlockNode = true;
                            codeBlockDebugLog(`Found FencedCode node. Applying ${endDocLine.number - startDocLine.number + 1} line decorations with class 'cm-fenced-code-background'.`);

                            // Apply line decoration to each line of the code block
                            for (let lineNo = startDocLine.number; lineNo <= endDocLine.number; lineNo++) {
                                const line = state.doc.line(lineNo);
                                // Log the entire line object carefully before accessing properties.
                                try {
                                    codeBlockDebugLog(`Processing line object for lineNo ${lineNo}:`, JSON.stringify(line, null, 2));
                                } catch (e) {
                                    codeBlockDebugLog(`Error stringifying line object for lineNo ${lineNo}:`, e);
                                    codeBlockDebugLog(`Raw line object for lineNo ${lineNo}:`, line);
                                }

                                if (line && typeof line.from === 'number' && typeof line.to === 'number') { // Added check for line.to as well
                                    codeBlockDebugLog(`PRE-ADD for line ${lineNo}: from=${line.from}, to=${line.to}, text=\"${line.text.substring(0, 30)}...\"`);
            // MOVED LOGIC STARTS HERE
            const isFirstLine = lineNo === startDocLine.number;
            const isLastLine = lineNo === endDocLine.number;

            let lineClasses = 'cm-fenced-code-background cm-code-block-content';
            if (isFirstLine) {
                lineClasses += ' cm-fenced-code-first-line';
            }
            if (isLastLine) {
                lineClasses += ' cm-fenced-code-last-line';
            }

            const currentLineDecoration = Decoration.line({
                attributes: { class: lineClasses }
            });
            // MOVED LOGIC ENDS HERE

            try { // Now currentLineDecoration is defined and can be logged
                codeBlockDebugLog('[CodeBlockDebug] PRE-ADD currentLineDecoration object:', JSON.stringify(currentLineDecoration, null, 2));
            } catch (e) {
                codeBlockDebugLog('[CodeBlockDebug] Error stringifying currentLineDecoration:', e);
                codeBlockDebugLog('[CodeBlockDebug] PRE-ADD raw currentLineDecoration object:', currentLineDecoration);
            }
                                const rangeToAdd = currentLineDecoration.range(line.from, line.from);
                                decorationsArray.push(rangeToAdd);

                                // Add logging immediately after the push, as per user's "immediate_sub_task"
                                // Ensure 'line.number' (or an equivalent line identifier) is available here
                                if (typeof line !== 'undefined' && typeof line.number !== 'undefined') {
                                  codeBlockDebugLog(`AFTER PUSH on line ${line.number}: decorationsArray.length is now ${decorationsArray.length}`);
                                  codeBlockDebugLog(`Last pushed item on line ${line.number}:`, JSON.stringify(rangeToAdd));
                                } else {
                                  // Fallback if line.number is not available, though it's expected from logs
                                  codeBlockDebugLog(`AFTER PUSH: decorationsArray.length is now ${decorationsArray.length}`);
                                  codeBlockDebugLog(`Last pushed item:`, JSON.stringify(rangeToAdd));
                                }
                                } else {
                                    codeBlockDebugLog(`Invalid or incomplete line object for lineNo ${lineNo}. Skipping decoration. Line object:`, JSON.stringify(line, null, 2));
                                }
                            }

                            // Extract code content (without fence markers)
                            const text = state.doc.sliceString(node.from, node.to);
                            const lines = text.split('\n');
                            const content = lines.slice(1, -1).join('\n');
                            // TEMPORARY LOGGING FOR VERIFICATION:
                            codeBlockDebugLog('[CopyButton Content Check] Node From-To:', JSON.stringify(state.doc.sliceString(node.from, node.to)));
                            codeBlockDebugLog('[CopyButton Content Check] Extracted for Copy:', JSON.stringify(content));
                            // End TEMPORARY LOGGING

                            // Add copy button widget at the start of the first line
                            const copyWidget = Decoration.widget({
                                widget: new CopyButtonWidget(content),
                                side: -1 // inline widget; we position via CSS
                            });
                            decorationsArray.push(copyWidget.range(startDocLine.from, startDocLine.from));

                            return false; // Don't descend into children
                        }
                        return true;
                    }
                });
            }

            if (!foundCodeBlockNode) {
                console.log('[CodeBlockDebug] No "CodeBlock" named nodes found in visible ranges.');
            }
            console.log('[CodeBlockDebug] Number of decorations prepared in array:', decorationsArray.length);
            if (decorationsArray.length > 0 && decorationsArray[0] && decorationsArray[0].spec) {
                console.log('[CodeBlockDebug] First decoration spec in array:', JSON.stringify(decorationsArray[0].spec, null, 2));
            } else if (decorationsArray.length > 0) {
                console.log('[CodeBlockDebug] First decoration in array (full object):', JSON.stringify(decorationsArray[0], null, 2));
            }

                        console.log(`[CodeBlockDebug] FINAL decorationsArray length before Decoration.set: ${decorationsArray.length}`);
            if (decorationsArray.length > 0) {
              console.log(`[CodeBlockDebug] First decoration in FINAL array:`, JSON.stringify(decorationsArray[0]));
              // For more detailed debugging, you could log the entire array if it's not too large:
              // console.log(`[CodeBlockDebug] All decorations in FINAL array:`, JSON.stringify(decorationsArray, null, 2));
            }
            const result = Decoration.set(decorationsArray, true); // true to sort/normalize if needed
            
result.between(0, state.doc.length, (from, to, value) => {
    let decorationType = 'N/A';
    if (value && value.spec) {
        if (value.spec.attributes && typeof value.spec.attributes.class === 'string') {
            decorationType = `Line Decoration (classes: ${value.spec.attributes.class})`;
        } else if (value.spec.widget) {
            decorationType = `Widget (${value.spec.widget.constructor.name})`;
        } else if (value.spec.tagName) {
            decorationType = `Mark Decoration (tag: ${value.spec.tagName}, class: ${value.spec.class || value.spec.attributes?.class || 'none'})`;
        } else if (value.spec.block) {
            decorationType = `Block Decoration (class: ${value.spec.attributes?.class || 'none'})`;
        }
    }
    codeBlockDebugLog(`Decoration in Set: from ${from}, to ${to}, type: ${decorationType}`);
});

            // Record timing for performance testing (test mode only)
            if (import.meta.env?.MODE === 'test') {
                __codeBlockTiming.lastDecorateMs = performance.now() - t0;
            }
            
            return result;
        }
    },
    { decorations: v => v.decorations }
);

/**
 * Creates the complete code block extension with copy functionality
 */
export function createCodeBlockWithCopyExtension(): Extension[] {
    return [codeBlockTheme, codeBlockPlugin];
}