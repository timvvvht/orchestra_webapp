/**
 * Enhanced Code Fence Detection for CodeMirror 6
 * Based on best practices for Markdown editing with code fence support
 */

import { Extension } from '@codemirror/state';
import { ViewPlugin, DecorationSet, Decoration, EditorView, WidgetType, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
// Flag to enable detailed debugging
const DEBUG_MERMAID = true;

/**
 * Helper function to normalize language names for better compatibility with CodeMirror
 * This maps common language identifiers to their CodeMirror equivalents
 */
function normalizeLanguageName(lang: string): string {
    if (!lang) return '';

    // Convert to lowercase for case-insensitive matching
    const langLower = lang.toLowerCase();

    // Map of common language aliases to their standard names
    const languageMap: Record<string, string> = {
        // JavaScript family
        js: 'javascript',
        jsx: 'jsx',
        javascript: 'javascript',
        ts: 'typescript',
        tsx: 'tsx',
        typescript: 'typescript',

        // Python
        py: 'python',
        python: 'python',
        python3: 'python',

        // Ruby
        rb: 'ruby',
        ruby: 'ruby',

        // Go
        go: 'go',
        golang: 'go',

        // JVM languages
        java: 'java',
        kotlin: 'kotlin',
        scala: 'scala',
        groovy: 'groovy',

        // C-family
        c: 'c',
        cpp: 'cpp',
        'c++': 'cpp',
        cxx: 'cpp',
        cs: 'csharp',
        csharp: 'csharp',
        'c#': 'csharp',
        'objective-c': 'objectivec',
        objc: 'objectivec',

        // Web
        html: 'html',
        css: 'css',
        scss: 'scss',
        sass: 'sass',
        less: 'less',
        php: 'php',

        // Shell
        sh: 'bash',
        bash: 'bash',
        zsh: 'bash',
        shell: 'bash',
        powershell: 'powershell',
        ps: 'powershell',
        ps1: 'powershell',
        batch: 'batch',
        bat: 'batch',
        cmd: 'batch',

        // Data formats
        yaml: 'yaml',
        yml: 'yaml',
        json: 'json',
        xml: 'xml',
        toml: 'toml',
        ini: 'ini',
        csv: 'csv',

        // Markup
        md: 'markdown',
        markdown: 'markdown',
        tex: 'latex',
        latex: 'latex',
        rst: 'restructuredtext',

        // Query languages
        sql: 'sql',
        graphql: 'graphql',
        gql: 'graphql',

        // Mobile
        swift: 'swift',
        dart: 'dart',

        // Systems programming
        rust: 'rust',
        rs: 'rust',
        haskell: 'haskell',
        hs: 'haskell',
        elixir: 'elixir',
        ex: 'elixir',
        erlang: 'erlang',
        erl: 'erlang',

        // Data science
        r: 'r',
        julia: 'julia',
        matlab: 'matlab',

        // DevOps
        dockerfile: 'dockerfile',
        docker: 'dockerfile',
        makefile: 'makefile',
        make: 'makefile',
        terraform: 'terraform',
        tf: 'terraform',
        hcl: 'hcl',

        // Other
        diff: 'diff',
        patch: 'diff',
        lua: 'lua',
        clojure: 'clojure',
        clj: 'clojure',
        elm: 'elm',
        ocaml: 'ocaml',
        ml: 'ocaml'
    };

    // Return the mapped language or the original if not found
    return languageMap[langLower] || lang;
}

/**
 * Creates a comprehensive code fence detection and styling extension
 * following best practices for CodeMirror 6
 */
export function createEnhancedCodeFenceExtension(): Extension[] {
    return [
        // Base theme for code blocks with improved selectors
        EditorView.baseTheme({
            // Style code fence markers instead of hiding them completely
            '.cm-code-fence-marker': {
                color: 'var(--text-faint, rgba(0, 0, 0, 0.3))',
                opacity: '0.5',
                fontSize: '0.85em'
            },

            // Only show code fence markers on active line
            '.cm-line.cm-activeLine .cm-code-fence-marker': {
                display: 'inline'
            },

            // Basic styling for code blocks - using specific class selectors instead of general siblings
            '.cm-line.cm-code-block-start': {
                fontFamily: 'var(--font-monospace, monospace)',
                backgroundColor: 'var(--code-background, rgba(0, 0, 0, 0.12))',
                borderTopLeftRadius: '6px',
                borderTopRightRadius: '6px',
                padding: '8px 16px',
                marginTop: '16px',
                border: '1px solid var(--border-color, rgba(0, 0, 0, 0.1))',
                borderBottom: 'none',
                minHeight: '16px' // Ensure the line has height even when content is hidden
            },
            '.cm-line.cm-code-block-content': {
                fontFamily: 'var(--font-monospace, monospace)',
                backgroundColor: 'var(--code-background, rgba(0, 0, 0, 0.12))',
                padding: '0 16px',
                whiteSpace: 'pre',
                borderLeft: '1px solid var(--border-color, rgba(0, 0, 0, 0.1))',
                borderRight: '1px solid var(--border-color, rgba(0, 0, 0, 0.1))'
            },
            '.cm-line.cm-code-block-end': {
                fontFamily: 'var(--font-monospace, monospace)',
                backgroundColor: 'var(--code-background, rgba(0, 0, 0, 0.12))',
                borderBottomLeftRadius: '6px',
                borderBottomRightRadius: '6px',
                padding: '0 16px 8px',
                marginBottom: '16px',
                border: '1px solid var(--border-color, rgba(0, 0, 0, 0.1))',
                borderTop: 'none',
                minHeight: '16px' // Ensure the line has height even when content is hidden
            },

            // Formatting tokens styling - hide by default, show only on active line
            '.cm-formatting-code-block': {
                display: 'none'
            },
            '.cm-line.cm-activeLine .cm-formatting-code-block': {
                display: 'inline',
                color: 'var(--text-faint)',
                opacity: 0.7
            },
            '.cm-hmd-codeblock': {
                fontFamily: 'var(--font-monospace, monospace)',
                color: 'var(--code-normal)'
            },

            // Syntax highlighting for code blocks - general selectors
            '.cm-keyword': { color: 'var(--syntax-keyword, #0000ff)' },
            '.cm-operator': { color: 'var(--syntax-operator, #0000ff)' },
            '.cm-variable': { color: 'var(--syntax-variable, #0055aa)' },
            '.cm-variable-2': { color: 'var(--syntax-variable, #0055aa)' },
            '.cm-variable-3': { color: 'var(--syntax-variable-special, #008855)' },
            '.cm-builtin': { color: 'var(--syntax-builtin, #3300ff)' },
            '.cm-atom': { color: 'var(--syntax-atom, #221199)' },
            '.cm-number': { color: 'var(--syntax-number, #116644)' },
            '.cm-def': { color: 'var(--syntax-definition, #0000ff)' },
            '.cm-string': { color: 'var(--syntax-string, #aa1111)' },
            '.cm-string-2': { color: 'var(--syntax-string-special, #ff5500)' },
            '.cm-comment': { color: 'var(--syntax-comment, #aa5500)' },
            '.cm-tag': { color: 'var(--syntax-tag, #116644)' },
            '.cm-meta': { color: 'var(--syntax-meta, #555555)' },
            '.cm-attribute': { color: 'var(--syntax-attribute, #0055aa)' },
            '.cm-property': { color: 'var(--syntax-property, #3300ff)' },
            '.cm-qualifier': { color: 'var(--syntax-qualifier, #555555)' },
            '.cm-type': { color: 'var(--syntax-type, #008855)' },

            // Dark theme adjustments
            '&.theme-dark .cm-line.cm-code-block-start, &.theme-dark .cm-line.cm-code-block-content, &.theme-dark .cm-line.cm-code-block-end': {
                backgroundColor: 'var(--code-background, rgba(255, 255, 255, 0.08))',
                border: '1px solid var(--border-color-dark, rgba(255, 255, 255, 0.1))'
            },
            '&.theme-dark .cm-line.cm-code-block-start': {
                borderBottom: 'none'
            },
            '&.theme-dark .cm-line.cm-code-block-content': {
                borderTop: 'none',
                borderBottom: 'none'
            },
            '&.theme-dark .cm-line.cm-code-block-end': {
                borderTop: 'none'
            },

            // Dark theme syntax highlighting - general selectors
            '&.theme-dark .cm-keyword': { color: 'var(--syntax-keyword-dark, #88ddff)' },
            '&.theme-dark .cm-operator': { color: 'var(--syntax-operator-dark, #88ddff)' },
            '&.theme-dark .cm-variable': { color: 'var(--syntax-variable-dark, #99bbff)' },
            '&.theme-dark .cm-variable-2': { color: 'var(--syntax-variable-dark, #99bbff)' },
            '&.theme-dark .cm-variable-3': { color: 'var(--syntax-variable-special-dark, #ff9900)' },
            '&.theme-dark .cm-builtin': { color: 'var(--syntax-builtin-dark, #88ddff)' },
            '&.theme-dark .cm-atom': { color: 'var(--syntax-atom-dark, #bb99ff)' },
            '&.theme-dark .cm-number': { color: 'var(--syntax-number-dark, #ff9900)' },
            '&.theme-dark .cm-def': { color: 'var(--syntax-definition-dark, #88ddff)' },
            '&.theme-dark .cm-string': { color: 'var(--syntax-string-dark, #ffbb99)' },
            '&.theme-dark .cm-string-2': { color: 'var(--syntax-string-special-dark, #ffbb99)' },
            '&.theme-dark .cm-comment': { color: 'var(--syntax-comment-dark, #88aa77)' },
            '&.theme-dark .cm-tag': { color: 'var(--syntax-tag-dark, #ff9900)' },
            '&.theme-dark .cm-meta': { color: 'var(--syntax-meta-dark, #8899aa)' },
            '&.theme-dark .cm-attribute': { color: 'var(--syntax-attribute-dark, #99bbff)' },
            '&.theme-dark .cm-property': { color: 'var(--syntax-property-dark, #88ddff)' },
            '&.theme-dark .cm-qualifier': { color: 'var(--syntax-qualifier-dark, #8899aa)' },
            '&.theme-dark .cm-type': { color: 'var(--syntax-type-dark, #ff9900)' }
        }),

        // Plugin to add decorations and widgets to code blocks
        enhancedCodeFencePlugin()
    ];
}

/**
 * Widget for the language indicator in code blocks
 */
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
}

/**
 * Widget for the copy button in code blocks
 */
class CopyButtonWidget extends WidgetType {
    constructor(readonly codeContent: string) {
        super();
    }

    eq(other: CopyButtonWidget): boolean {
        return other.codeContent === this.codeContent;
    }

    toDOM(): HTMLElement {
        const button = document.createElement('button');
        button.className = 'code-block-copy-button';
        button.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
        button.title = 'Copy code';

        // Add click event listener to copy the code
        button.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();

            // Copy the code to clipboard
            navigator.clipboard.writeText(this.codeContent.trim()).then(() => {
                // Visual feedback
                button.classList.add('copied');
                button.innerHTML =
                    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';

                // Reset after 1.5 seconds
                setTimeout(() => {
                    button.classList.remove('copied');
                    button.innerHTML =
                        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
                }, 1500);
            });
        });

        return button;
    }
}

/**
 * Enhanced plugin for code fence detection and styling
 * Uses improved regex and state tracking for accurate detection
 */
function enhancedCodeFencePlugin() {
    return ViewPlugin.fromClass(
        class {
            decorations: DecorationSet;

            constructor(view: EditorView) {
                view.dom.classList.add('has-enhanced-code-fences');
                this.decorations = this.buildDecorations(view);
            }

            update(update: ViewUpdate) {
                if (update.docChanged || update.viewportChanged) {
                    this.decorations = this.buildDecorations(update.view);
                }
            }

            /**
             * Build decorations for code blocks with improved detection
             */
            buildDecorations(view: EditorView): DecorationSet {
                // const builder = new RangeSetBuilder<Decoration>(); // Original line 359, now part of the main function
                const { state } = view; // Original first line, now effectively part of bypassed code
                const { doc } = state;

                // Track code block state
                let inCodeBlock = false;
                let codeBlockStart = -1;
                let codeBlockLanguage = '';
                let codeBlockContent = '';

                // First pass: collect all code blocks and their ranges
                const codeBlocks: Array<{
                    startLine: number;
                    endLine: number;
                    startPos: number;
                    language: string;
                    content: string;
                }> = [];

                // Process each line in the document to identify code blocks
                for (let i = 1; i <= doc.lines; i++) {
                    const line = doc.line(i);
                    const lineText = line.text;

                    // Improved code fence detection with precise regex
                    // This checks for a proper code fence line: optional whitespace, ```, optional language, optional whitespace
                    // Using a more strict regex to avoid false positives
                    // The regex now explicitly captures the entire line to ensure we replace everything
                    const isCodeFence = /^(\s*```([a-zA-Z0-9_+#-]*)\s*)$/.test(lineText);

                    if (isCodeFence && !inCodeBlock) {
                        // Extract language if specified - using a more precise regex
                        const match = lineText.match(/^(\s*```([a-zA-Z0-9_+#-]*)\s*)$/);
                        const language = match && match[2] ? match[2].trim().toLowerCase() : '';

                        // Skip Mermaid blocks - let the dedicated extension handle them
                        if (language === 'mermaid') {
                          if (DEBUG_MERMAID) {
                            console.log(`[CodeFence] Skipping Mermaid code block at line ${i} - will be handled by Mermaid extension`);
                          }
                          continue;
                        }

                        // Start of code block
                        inCodeBlock = true;
                        codeBlockStart = line.from;
                        codeBlockLanguage = language;

                        // Log the detected language for debugging
                        console.log(`[CodeFence] Detected code block with language: '${codeBlockLanguage}'`);

                        // Reset code block content
                        codeBlockContent = '';

                        // Normalize language name for better compatibility
                        const normalizedLanguage = normalizeLanguageName(codeBlockLanguage);

                        // Start tracking a new code block
                        codeBlocks.push({
                            startLine: i,
                            endLine: -1, // Will be set when we find the end
                            startPos: line.from,
                            language: normalizedLanguage,
                            content: ''
                        });
                    } else if (isCodeFence && inCodeBlock) {
                        // End of code block
                        inCodeBlock = false;

                        // Update the last code block with end information
                        if (codeBlocks.length > 0) {
                            const lastBlock = codeBlocks[codeBlocks.length - 1];
                            lastBlock.endLine = i;
                            lastBlock.content = codeBlockContent;
                        }

                        // Reset tracking variables
                        codeBlockStart = -1;
                        codeBlockLanguage = '';
                    } else if (inCodeBlock) {
                        // Inside code block content
                        codeBlockContent += lineText + '\n';
                    }
                }

                // Handle any unclosed code blocks by closing them at the end of the document
                if (inCodeBlock && codeBlocks.length > 0) {
                    const lastBlock = codeBlocks[codeBlocks.length - 1];
                    lastBlock.endLine = doc.lines; // Set the end line to the last line of the document
                    lastBlock.content = codeBlockContent;

                    // Reset tracking variables
                    inCodeBlock = false;
                    codeBlockStart = -1;
                    codeBlockLanguage = '';

                    console.warn('Found unclosed code block - automatically closing at end of document');
                }

                // Log the number of code blocks found with detailed information
                if (codeBlocks.length > 0) {
                    console.log(`Found ${codeBlocks.length} code blocks`);
                    codeBlocks.forEach((block, index) => {
                        console.log(`Code block #${index + 1}:`, {
                            language: block.language || 'none',
                            startLine: block.startLine,
                            endLine: block.endLine,
                            contentLength: block.content.length,
                            firstContentLine: block.content.split('\n')[0]?.substring(0, 30) + '...'
                        });
                    });

                    // Add a data attribute to the editor to help with debugging
                    const editorElement = view.dom.closest('.codemirror-wrapper');
                    if (editorElement) {
                        editorElement.setAttribute(
                            'data-code-blocks',
                            JSON.stringify(
                                codeBlocks.map(block => ({
                                    language: block.language,
                                    lines: [block.startLine, block.endLine]
                                }))
                            )
                        );
                    }
                }

                // Prepare all decorations in advance and sort them properly
                const lineDecorations: Array<{ from: number; to: number; decoration: Decoration; priority: number }> = [];
                const widgetDecorations: Array<{ from: number; to: number; decoration: Decoration; priority: number }> = [];

                // First collect all line decorations
                for (let i = 1; i <= doc.lines; i++) {
                    const line = doc.line(i);

                    // Find if this line is part of a code block
                    // More precise check to ensure we're only styling lines that are actually part of a code block
                    const codeBlock = codeBlocks.find(block => i >= block.startLine && (block.endLine === -1 || i <= block.endLine));

                    // Skip lines that are marked as Mermaid blocks
                    const isMermaidLine = line.text.match(/^\s*```mermaid\s*$/) || 
                                         Array.from(view.dom.querySelectorAll(`.cm-line:nth-child(${i}) .cm-mermaid-block-marker`)).length > 0;

                    // Skip lines that aren't part of a code block or are part of a Mermaid block
                    if (!codeBlock || isMermaidLine) continue;

                    // TEST: Add a debug class to all lines within any detected code block
                    lineDecorations.push({
                        from: line.from,
                        to: line.from,
                        decoration: Decoration.line({ class: 'cm-debug-is-code-block-line' }),
                        priority: 0 // Low priority, just for testing
                    });

                    // Process code block line
                    if (i === codeBlock.startLine) {
                        // Start of code block with language if specified
                        const classNames = ['cm-code-block-start'];
                        if (codeBlock.language) {
                            classNames.push(`language-${codeBlock.language}`);
                            // Add a data attribute for the language to help with debugging
                            classNames.push(`cm-lang-${codeBlock.language}`);
                        }

                        // Add line decoration for the start line
                        lineDecorations.push({
                            from: line.from,
                            to: line.from,
                            decoration: Decoration.line({ class: classNames.join(' ') }),
                            priority: 1 // Line decorations have lower priority
                        });

                        // Instead of replacing content, we'll use a mark decoration to style it
                        // This preserves the original text and keeps it editable
                        lineDecorations.push({
                            from: line.from,
                            to: line.to,
                            decoration: Decoration.mark({
                                class: 'cm-code-fence-marker',
                                attributes: {
                                    'data-fence-type': 'start',
                                    'data-language': codeBlock.language || 'none'
                                }
                            }),
                            priority: 5 // Lower priority to avoid conflicts
                        });

                        // Log for debugging
                        console.log(`[CodeFence] Styling start fence for language: '${codeBlock.language || 'none'}'`);
                    } else if (i === codeBlock.endLine) {
                        // End of code block
                        lineDecorations.push({
                            from: line.from,
                            to: line.from,
                            decoration: Decoration.line({ class: 'cm-code-block-end' }),
                            priority: 1 // Line decorations have lower priority
                        });

                        // Instead of replacing content, we'll use a mark decoration to style it
                        // This preserves the original text and keeps it editable
                        lineDecorations.push({
                            from: line.from,
                            to: line.to,
                            decoration: Decoration.mark({
                                class: 'cm-code-fence-marker',
                                attributes: {
                                    'data-fence-type': 'end'
                                }
                            }),
                            priority: 5 // Lower priority to avoid conflicts
                        });

                        // Log for debugging
                        console.log(`[CodeFence] Styling end fence for code block`);
                    } else {
                        // Inside code block content
                        const contentClassNames = ['cm-code-block-content'];
                        if (codeBlock.language) {
                            contentClassNames.push(`language-${codeBlock.language}`);
                            // Add a data attribute for the language to help with debugging
                            contentClassNames.push(`cm-lang-${codeBlock.language}`);
                        }

                        lineDecorations.push({
                            from: line.from,
                            to: line.from,
                            decoration: Decoration.line({
                                class: contentClassNames.join(' ')
                            }),
                            priority: 1 // Line decorations have lower priority
                        });
                    }
                }

                // Then collect all widgets
                for (const block of codeBlocks) {
                    // Only add widgets for complete code blocks
                    if (block.endLine !== -1) {
                        // Add language indicator if a language is specified
                        // This is the language hint that appears at the top right of the code block
                        // We want to keep this visible even though we're hiding the raw backtick syntax
                        if (block.language) {
                            widgetDecorations.push({
                                from: block.startPos,
                                to: block.startPos,
                                decoration: Decoration.widget({
                                    widget: new LanguageIndicatorWidget(block.language),
                                    side: 1
                                }),
                                priority: 2 // Widgets have higher priority
                            });
                        }

                        // Add copy button at the start of the code block
                        widgetDecorations.push({
                            from: block.startPos,
                            to: block.startPos,
                            decoration: Decoration.widget({
                                widget: new CopyButtonWidget(block.content),
                                side: 2 // Ensure this comes after the language indicator
                            }),
                            priority: 3 // Copy button has highest priority
                        });
                    }
                }

                // Sort line decorations by position and priority
                // Higher priority decorations should come first for the same position
                lineDecorations.sort((a, b) => {
                    if (a.from !== b.from) return a.from - b.from;
                    // Reverse sort by priority so higher priority comes first
                    return b.priority - a.priority;
                });

                // Sort widget decorations by position and then by priority
                // Higher priority decorations should come first for the same position
                widgetDecorations.sort((a, b) => {
                    if (a.from !== b.from) return a.from - b.from;
                    // Reverse sort by priority so higher priority comes first
                    return b.priority - a.priority;
                });

                // Now add the sorted decorations to the builder in the correct order
                // First add all line decorations, then all widget decorations
                const builder = new RangeSetBuilder<Decoration>();

                // Add line decorations first
                for (const { from, to, decoration } of lineDecorations) {
                    builder.add(from, to, decoration);
                }

                // Then add widget decorations
                for (const { from, to, decoration } of widgetDecorations) {
                    builder.add(from, to, decoration);
                }

                return builder.finish();
            }
        },
        {
            decorations: v => v.decorations
        }
    );
}
