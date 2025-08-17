import { Extension, RangeSetBuilder } from '@codemirror/state';
import { ViewPlugin, DecorationSet, Decoration, EditorView, WidgetType, ViewUpdate } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';

// ... (codeBlockBaseTheme, LanguageIndicatorWidget, CopyButtonWidget implementations remain IDENTICAL to the previous version) ...
// (Ensure these are correctly in your file)
// Define the base theme for code blocks styling with enhanced container appearance
const codeBlockBaseTheme = EditorView.baseTheme({
    // Style code fence markers (subtle styling when shown)
    '.cm-code-fence-marker-styled': {
        color: 'var(--text-faint, rgba(0, 0, 0, 0.3))',
        opacity: '0.5',
        fontSize: '0.85em',
        display: 'none' // Hide by default, show on active line
    },

    // Show code fence markers on active line
    '.cm-line.cm-activeLine .cm-code-fence-marker-styled': {
        display: 'inline'
    },

    // Enhanced container styling for code blocks
    '.cm-line.cm-code-block-start, .cm-line.cm-code-block-content, .cm-line.cm-code-block-end': {
        fontFamily: 'var(--font-monospace, "JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace)',
        position: 'relative',
        backgroundColor: 'var(--code-background)',
        transition: 'all 0.2s ease'
    },

    // Enhanced styling for code block start with header appearance
    '.cm-line.cm-code-block-start': {
        borderTopLeftRadius: '8px',
        borderTopRightRadius: '8px',
        padding: '12px 16px 8px 16px',
        marginTop: '20px',
        border: '1px solid var(--background-modifier-border)',
        borderBottom: 'none',
        minHeight: '20px',
        backgroundColor: 'var(--code-background)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        position: 'relative',
        backgroundImage:
            'linear-gradient(to bottom, var(--code-background) 0%, color-mix(in srgb, var(--code-background) 95%, var(--background-modifier-border) 5%) 100%)'
    },

    // Enhanced styling for code block content with better readability
    '.cm-line.cm-code-block-content': {
        padding: '4px 16px',
        whiteSpace: 'pre',
        borderLeft: '1px solid var(--background-modifier-border)',
        borderRight: '1px solid var(--background-modifier-border)',
        backgroundColor: 'var(--code-background)',
        lineHeight: '1.5',
        fontSize: '0.9em'
    },

    // Enhanced styling for code block end with footer appearance
    '.cm-line.cm-code-block-end': {
        borderBottomLeftRadius: '8px',
        borderBottomRightRadius: '8px',
        padding: '8px 16px 12px 16px',
        marginBottom: '20px',
        border: '1px solid var(--background-modifier-border)',
        borderTop: 'none',
        minHeight: '20px',
        backgroundColor: 'var(--code-background)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        backgroundImage:
            'linear-gradient(to top, var(--code-background) 0%, color-mix(in srgb, var(--code-background) 95%, var(--background-modifier-border) 5%) 100%)'
    },

    // Hover effects for better interactivity
    '.cm-line.cm-code-block-start:hover, .cm-line.cm-code-block-content:hover, .cm-line.cm-code-block-end:hover': {
        backgroundColor: 'color-mix(in srgb, var(--code-background) 95%, var(--text-accent) 5%)',
        borderColor: 'var(--text-accent)'
    },

    // Dark theme adjustments with better contrast
    '.theme-dark .cm-line.cm-code-block-start, .theme-dark .cm-line.cm-code-block-content, .theme-dark .cm-line.cm-code-block-end': {
        border: '1px solid var(--background-modifier-border)',
        backgroundColor: 'var(--code-background)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
    },
    '.theme-dark .cm-line.cm-code-block-start': {
        borderBottom: 'none',
        backgroundImage:
            'linear-gradient(to bottom, var(--code-background) 0%, color-mix(in srgb, var(--code-background) 90%, var(--background-modifier-border) 10%) 100%)'
    },
    '.theme-dark .cm-line.cm-code-block-content': {
        borderTop: 'none',
        borderBottom: 'none'
    },
    '.theme-dark .cm-line.cm-code-block-end': {
        borderTop: 'none',
        backgroundImage:
            'linear-gradient(to top, var(--code-background) 0%, color-mix(in srgb, var(--code-background) 90%, var(--background-modifier-border) 10%) 100%)'
    },

    // Light theme adjustments
    '.theme-light .cm-line.cm-code-block-start, .theme-light .cm-line.cm-code-block-content, .theme-light .cm-line.cm-code-block-end': {
        backgroundColor: 'var(--code-background)',
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)'
    },

    '.code-block-language': {
        position: 'absolute',
        top: '10px',
        right: '50px',
        fontSize: '0.7em',
        padding: '4px 8px',
        borderRadius: '6px',
        backgroundColor: 'var(--text-accent)',
        color: 'var(--text-on-accent)',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        opacity: '0.9',
        border: '1px solid color-mix(in srgb, var(--text-accent) 80%, transparent 20%)',
        zIndex: '15',
        fontFamily: 'var(--font-ui)',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.2s ease'
    },
    '.code-block-language:hover': {
        opacity: '1',
        transform: 'translateY(-1px)',
        boxShadow: '0 3px 6px rgba(0, 0, 0, 0.15)'
    },
    '.code-block-copy-button': {
        position: 'absolute',
        top: '8px',
        right: '8px',
        width: '32px',
        height: '32px',
        padding: '6px',
        backgroundColor: 'var(--background-secondary)',
        border: '1px solid var(--background-modifier-border)',
        borderRadius: '6px',
        color: 'var(--text-muted)',
        cursor: 'pointer',
        opacity: '0.7',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: '20',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(4px)'
    },
    '.code-block-copy-button:hover': {
        opacity: '1',
        backgroundColor: 'var(--background-modifier-hover)',
        borderColor: 'var(--text-accent)',
        transform: 'translateY(-1px)',
        boxShadow: '0 3px 6px rgba(0, 0, 0, 0.15)'
    },
    '.code-block-copy-button:active': {
        transform: 'translateY(0)',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
    },
    '.code-block-copy-button.copied': {
        backgroundColor: 'var(--interactive-accent)',
        color: 'var(--text-on-accent)',
        borderColor: 'var(--interactive-accent)',
        transform: 'scale(1.05)'
    },
    '@keyframes copy-success': {
        '0%': { transform: 'scale(1.05)' },
        '50%': { transform: 'scale(1.15)' },
        '100%': { transform: 'scale(1.05)' }
    },
    '.code-block-copy-button.copied svg': {
        animation: 'copy-success 0.3s ease-in-out'
    },
    '.cm-line.cm-code-block-start:has(.code-block-copy-button:hover), .cm-line.cm-code-block-start:has(.code-block-language:hover)': {
        borderColor: 'var(--text-accent)',
        backgroundColor: 'color-mix(in srgb, var(--code-background) 95%, var(--text-accent) 5%)'
    }
});

class LanguageIndicatorWidget extends WidgetType {
    constructor(readonly language: string) {
        super();
    }
    eq(other: LanguageIndicatorWidget): boolean {
        return other.language === this.language;
    }
    toDOM(): HTMLElement {
        const indicator = document.createElement('span');
        indicator.className = 'code-block-language';
        indicator.textContent = this.language || 'text';
        return indicator;
    }
    destroy() {}
}

class CopyButtonWidget extends WidgetType {
    buttonElement?: HTMLElement;
    clickHandler?: (e: MouseEvent) => void;
    private isDestroyed = false;
    constructor(readonly codeContent: string) {
        super();
    }
    eq(other: CopyButtonWidget): boolean {
        return other.codeContent === this.codeContent;
    }
    toDOM(): HTMLElement {
        const button = document.createElement('button');
        this.buttonElement = button;
        button.className = 'code-block-copy-button';
        button.setAttribute('aria-label', 'Copy code to clipboard');
        button.title = 'Copy code to clipboard';
        button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
        this.clickHandler = async (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.isDestroyed) return;
            try {
                const cleanContent = this.codeContent.trim().replace(/\\r\\n/g, '\n');
                await navigator.clipboard.writeText(cleanContent);
                if (!this.isDestroyed && this.buttonElement) {
                    button.classList.add('copied');
                    button.title = 'Copied!';
                    button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                    setTimeout(() => {
                        if (!this.isDestroyed && this.buttonElement && this.buttonElement.classList.contains('copied')) {
                            this.buttonElement.classList.remove('copied');
                            this.buttonElement.title = 'Copy code to clipboard';
                            this.buttonElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2 2v1"></path></svg>`;
                        }
                    }, 2000);
                }
            } catch (error) {
                console.error('Failed to copy code to clipboard:', error);
                if (!this.isDestroyed && this.buttonElement) {
                    button.title = 'Failed to copy';
                    button.style.color = 'var(--text-error)';
                    setTimeout(() => {
                        if (!this.isDestroyed && this.buttonElement) {
                            this.buttonElement.title = 'Copy code to clipboard';
                            this.buttonElement.style.color = '';
                        }
                    }, 2000);
                }
                try {
                    const textArea = document.createElement('textarea');
                    textArea.value = this.codeContent.trim().replace(/\\r\\n/g, '\n');
                    textArea.style.position = 'fixed';
                    textArea.style.opacity = '0';
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                } catch (fallbackError) {
                    console.error('Fallback copy method also failed:', fallbackError);
                }
            }
        };
        button.addEventListener('click', this.clickHandler);
        return button;
    }
    destroy() {
        this.isDestroyed = true;
        if (this.buttonElement && this.clickHandler) {
            this.buttonElement.removeEventListener('click', this.clickHandler);
        }
        this.buttonElement = undefined;
        this.clickHandler = undefined;
    }
}

const lezerCodeBlockPlugin = ViewPlugin.fromClass(
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
            const { doc } = state;
            
            // Collect ALL decorations first, then sort globally
            const allDecorations: Array<{ from: number, to?: number, deco: Decoration }> = [];

            for (const { from, to } of view.visibleRanges) {
                syntaxTree(state).iterate({
                    from,
                    to,
                    enter: node => {
                        if (node.name === 'FencedCode' || node.name === 'CodeBlock') {
                            // ... (detailed logging from previous step - keep it) ...
                            console.log(`[CodeBlockStyling] Matched ${node.name} from ${node.from} to ${node.to}`);
                            const startLineNum = view.state.doc.lineAt(node.from).number;
                            const endLineNum = view.state.doc.lineAt(node.to).number;
                            console.log(`  └─ Spans editor lines: ${startLineNum} to ${endLineNum}`);
                            let language = '';
                            const codeInfoNode = node.node.getChild('CodeInfo');
                            if (codeInfoNode) {
                                language = view.state.doc.sliceString(codeInfoNode.from, codeInfoNode.to).trim();
                                console.log(`  └─ CodeInfo (language): "${language}" from ${codeInfoNode.from} to ${codeInfoNode.to}`);
                            } else {
                                console.log('  └─ CodeInfo (language): Not found');
                            }
                            const codeTextNodes = node.node.getChildren('CodeText');
                            let firstContentLine: number | null = null;
                            let lastContentLine: number | null = null;
                            let codeContentForButton = '';
                            if (codeTextNodes.length > 0) {
                                const codeTextNodeStart = codeTextNodes[0].from;
                                const codeTextNodeEnd = codeTextNodes[codeTextNodes.length - 1].to;
                                codeContentForButton = view.state.doc.sliceString(codeTextNodeStart, codeTextNodeEnd);
                                firstContentLine = view.state.doc.lineAt(codeTextNodeStart).number;
                                lastContentLine = view.state.doc.lineAt(codeTextNodeEnd).number;
                                console.log(`  └─ CodeText found: ${codeTextNodes.length} nodes.`);
                                console.log(`    └─ Content lines range: ${firstContentLine} to ${lastContentLine}`);
                                console.log(`    └─ Content preview: "${codeContentForButton.substring(0, 50).replace(/\n/g, '\\n')}..."`);
                            } else {
                                console.log('  └─ CodeText: No CodeText child nodes found for this FencedCode block.');
                            }

                            const codeBlockStartPos = node.from;
                            const openingFenceLine = view.state.doc.lineAt(node.from);
                            const closingFenceLine = view.state.doc.lineAt(node.to);
                            const languageInfo = language ? `language-${language}` : '';

                            const decorationsToAdd: Array<{ from: number; to?: number; deco: Decoration; sideValue?: number }> = [];

                            const firstCodeMarkNode = node.node.firstChild;
                            if (firstCodeMarkNode && firstCodeMarkNode.name === 'CodeMark' && firstCodeMarkNode.from === node.from) {
                                decorationsToAdd.push({
                                    from: firstCodeMarkNode.from,
                                    to: firstCodeMarkNode.to,
                                    deco: Decoration.mark({ class: 'cm-code-fence-marker-styled' })
                                });
                            }

                            if (language) {
                                decorationsToAdd.push({
                                    from: codeBlockStartPos,
                                    to: codeBlockStartPos,
                                    deco: Decoration.widget({ widget: new LanguageIndicatorWidget(language), side: 1 }),
                                    sideValue: 1
                                });
                            }

                            if (codeContentForButton) {
                                decorationsToAdd.push({
                                    from: codeBlockStartPos,
                                    to: codeBlockStartPos,
                                    deco: Decoration.widget({ widget: new CopyButtonWidget(codeContentForButton), side: 2 }),
                                    sideValue: 2
                                });
                            }

                            let startLineClasses = `cm-code-block-start ${languageInfo}`.trim();
                            if (openingFenceLine.number === closingFenceLine.number) {
                                startLineClasses += ' cm-code-block-end';
                            }
                            decorationsToAdd.push({
                                from: openingFenceLine.from,
                                to: openingFenceLine.from,
                                deco: Decoration.line({ attributes: { class: startLineClasses.trim() } })
                            });

                            if (firstContentLine !== null && lastContentLine !== null) {
                                console.log(`  └─ Decorating content lines [${firstContentLine}-${lastContentLine}] with 'cm-code-block-content'.`);
                                for (let l = firstContentLine; l <= lastContentLine; l++) {
                                    const lineDoc = doc.line(l);
                                    decorationsToAdd.push({
                                        from: lineDoc.from,
                                        to: lineDoc.from,
                                        deco: Decoration.line({ attributes: { class: `cm-code-block-content ${languageInfo}`.trim() } })
                                    });
                                }
                            } else if (startLineNum < endLineNum - 1) {
                                console.log(
                                    `  └─ Decorating empty/intermediate lines [${startLineNum + 1}-${
                                        endLineNum - 1
                                    }] with 'cm-code-block-content' (no CodeText).`
                                );
                                for (let l = startLineNum + 1; l < endLineNum; l++) {
                                    const lineDoc = doc.line(l);
                                    decorationsToAdd.push({
                                        from: lineDoc.from,
                                        to: lineDoc.from,
                                        deco: Decoration.line({ attributes: { class: `cm-code-block-content ${languageInfo}`.trim() } })
                                    });
                                }
                            } else if (startLineNum === endLineNum - 1 && !firstContentLine) {
                                // Corrected typo from previous
                                console.log(
                                    '  └─ Single content line detected between fences, but no CodeText node. Not applying cm-code-block-content currently.'
                                );
                            } else {
                                console.log(
                                    '  └─ NOT applying cm-code-block-content (no CodeText and no intermediate lines, or already handled by single-line).'
                                );
                            }

                            if (openingFenceLine.number < closingFenceLine.number) {
                                const lastCodeMarkNode = node.node.lastChild;
                                if (lastCodeMarkNode && lastCodeMarkNode.name === 'CodeMark' && lastCodeMarkNode.to === node.to) {
                                    decorationsToAdd.push({
                                        from: lastCodeMarkNode.from,
                                        to: lastCodeMarkNode.to,
                                        deco: Decoration.mark({ class: 'cm-code-fence-marker-styled' })
                                    });
                                }
                                decorationsToAdd.push({
                                    from: closingFenceLine.from,
                                    to: closingFenceLine.from,
                                    deco: Decoration.line({ attributes: { class: 'cm-code-block-end' } })
                                });
                            }

                            // Collect decorations instead of adding them immediately
                            decorationsToAdd.forEach(item => {
                                allDecorations.push(item);
                            });

                            return false;
                        }
                        return true;
                    }
                });
            }
            
            // Now sort ALL decorations globally
            console.log(`[CodeBlockStyling] Total decorations collected: ${allDecorations.length}`);
            
            // Sort by position first, then by type
            allDecorations.sort((a, b) => {
                if (a.from !== b.from) return a.from - b.from;
                
                // At same position, order by type: marks < lines < widgets
                const typeOrder = (item: typeof a) => {
                    if (item.deco.spec.widget) return 2;
                    if (item.deco.spec.attributes) return 1;
                    return 0; // marks
                };
                
                return typeOrder(a) - typeOrder(b);
            });
            
            // Add all decorations in sorted order
            allDecorations.forEach((item, idx) => {
                const type = item.deco.spec.widget ? 'widget' : 
                           item.deco.spec.attributes ? 'line' : 'mark';
                console.log(`[${idx}] Adding ${type} at ${item.from}`);
                
                if (item.to !== undefined && item.from !== item.to) {
                    // Mark decoration
                    builder.add(item.from, item.to, item.deco);
                } else {
                    // Line or widget decoration
                    builder.add(item.from, item.from, item.deco);
                }
            });
            
            return builder.finish();
        }
    },
    { decorations: v => v.decorations }
);

export function createCodeBlockStylingExtension(): Extension[] {
    return [codeBlockBaseTheme, lezerCodeBlockPlugin];
}
