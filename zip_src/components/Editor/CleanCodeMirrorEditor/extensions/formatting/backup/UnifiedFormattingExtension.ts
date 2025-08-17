/**
 * UnifiedFormattingExtension for handling all basic text formatting
 *
 * This extension replaces the old unified formatting system with a new implementation
 * that uses the extension architecture and properly integrates with the decoration manager.
 */

import { EditorView, Decoration, WidgetType } from '@codemirror/view';
import { Extension } from '@codemirror/state';
import { BaseDecorationExtension } from '../../core/BaseDecorationExtension';
import { ExtensionPriority } from '../../core/types';
import { SortableDecoration } from '../../core/DecorationManager';
import { isOnActiveLine, getActiveLine } from '../../core/utils';
import { CodeBlock } from './types';

/**
 * Widget for language indicator in code blocks
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
 * Widget for copy button in code blocks
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
 * Extension for unified formatting
 */
export class UnifiedFormattingExtension extends BaseDecorationExtension {
    private codeBlocks: CodeBlock[] = [];

    /**
     * Create a new UnifiedFormattingExtension
     */
    constructor() {
        super({
            id: 'unified-formatting',
            name: 'Unified Formatting',
            priority: ExtensionPriority.High,
            enabled: true
        });
    }

    /**
     * Create decorations for unified formatting
     * @param view The CodeMirror editor view
     * @returns An array of sortable decorations
     */
    createDecorations(view: EditorView): SortableDecoration[] {
        const { state } = view;
        const { doc } = state;
        const decorations: SortableDecoration[] = [];

        try {
            // Update code blocks
            this.codeBlocks = this.detectCodeBlocks(view);

            // Process each line in the document
            for (let pos = 0; pos < doc.length;) {
                const line = doc.lineAt(pos);
                // Check if line is active
                const isActive = isOnActiveLine(view, line.from);
                const lineText = line.text;
                
                // Skip processing if line is in a code block (except for code fence lines)
                const isInCodeBlock = this.isLineInCodeBlock(line.number);
                
                if (!isInCodeBlock) {
                    // Detect headers
                    this.detectHeaders(line, decorations);
                    
                    // Detect list markers
                    this.detectListMarkers(line, decorations);
                    
                    // Detect inline formatting
                    this.detectInlineFormatting(line, lineText, decorations, isActive);
                    
                    // Detect links and images
                    this.detectLinksAndImages(line, decorations);
                    
                    // Detect blockquotes
                    this.detectBlockquotes(line, decorations);
                    
                    // Detect horizontal rules
                    this.detectHorizontalRules(line, decorations);
                }
                
                // Always detect code fences, even if in a code block
                this.detectCodeFences(line, decorations);
                
                // Move to next line
                pos = line.to + 1;
            }
            
            // Add code block decorations after processing all lines
            this.addCodeBlockDecorations(view, decorations);

            return decorations;
        } catch (error) {
            console.error(`[UnifiedFormattingExtension] Error processing decorations:`, error);
            return [];
        }
    }
    
    /**
     * Detect all inline formatting in a line
     * @param line The line to check
     * @param lineText The text of the line
     * @param decorations The array of decorations to add to
     * @param isActive Whether the line is active
     */
    private detectInlineFormatting(line: any, lineText: string, decorations: SortableDecoration[], isActive: boolean): void {
        // Detect bold formatting
        this.detectBoldFormatting(line, lineText, decorations, isActive);
        
        // Detect italic formatting
        this.detectItalicFormatting(line, lineText, decorations, isActive);
        
        // Detect inline code formatting
        this.detectInlineCodeFormatting(line, lineText, decorations);
        
        // Detect strikethrough formatting
        this.detectStrikethroughFormatting(line, lineText, decorations);
        
        // Detect highlight formatting
        this.detectHighlightFormatting(line, lineText, decorations);
    }
    
    /**
     * Detect headers in a line
     * @param line The line to check
     * @param decorations The array of decorations to add to
     */
    private detectHeaders(line: any, decorations: SortableDecoration[]): void {
        try {
            const lineText = line.text;

            // Match headers: # to ###### followed by a space and text
            // More specific to avoid matching Python comments - requires a space after the #s
            const headerMatch = lineText.match(/^(#{1,6})\s+(.*)$/);

            if (headerMatch) {
                const hashMarker = headerMatch[1];
                const headerLevel = hashMarker.length; // # = 1, ## = 2, etc.
                const hashEnd = line.from + headerLevel;
                const headerStart = hashEnd + 1; // +1 for the space after the #
                const headerEnd = line.from + headerMatch[0].length;
                
                // Add line decoration for the entire header line first (lowest priority)
                decorations.push({
                    from: line.from,
                    to: line.from,
                    decoration: Decoration.line({
                        class: `cm-header-line cm-header-line-${headerLevel}`
                    }),
                    priority: 10, // Lower priority than the marker and content
                    source: this.config.id
                });

                // Add decoration for the hash symbols
                decorations.push({
                    from: line.from,
                    to: hashEnd,
                    decoration: Decoration.mark({
                        class: `cm-formatting cm-formatting-header cm-formatting-header-${headerLevel}`,
                        attributes: {
                            'data-header-hash': 'true',
                            'data-header-level': headerLevel.toString()
                        }
                    }),
                    priority: 20,
                    source: this.config.id
                });

                // Add decoration for the header text
                decorations.push({
                    from: headerStart,
                    to: headerEnd,
                    decoration: Decoration.mark({
                        class: `cm-header cm-header-${headerLevel}`,
                        attributes: { 'data-header-level': headerLevel.toString() }
                    }),
                    priority: 20,
                    source: this.config.id
                });
            }
        } catch (error) {
            console.error(`[UnifiedFormattingExtension] Error detecting headers:`, error);
        }
    }
    
    /**
     * Detect code fences in a line
     * @param line The line to check
     * @param decorations The array of decorations to add to
     */
    private detectCodeFences(line: any, decorations: SortableDecoration[]): void {
        const lineText = line.text;

        // Match code fence markers: ``` optionally followed by a language identifier
        const codeFenceMatch = lineText.match(/^(\s*```([a-zA-Z0-9_+#-]*)\s*)$/);

        if (codeFenceMatch) {
            const fullMatch = codeFenceMatch[1];
            const language = codeFenceMatch[2] ? codeFenceMatch[2].trim() : '';
            
            // Add decoration for the entire code fence line
            decorations.push({
                from: line.from,
                to: line.from + fullMatch.length,
                decoration: Decoration.mark({
                    class: 'cm-formatting cm-formatting-code-block',
                    attributes: {
                        'data-formatting-type': 'code-fence',
                        'data-language': language || ''
                    }
                }),
                priority: 20,
                source: this.config.id
            });
            
            // Add line decoration for the code fence line
            decorations.push({
                from: line.from,
                to: line.from,
                decoration: Decoration.line({
                    class: 'cm-code-fence-line'
                }),
                priority: 10, // Lower priority than the marker
                source: this.config.id
            });
        }
    }
    
    /**
     * Check if a line is part of a code block
     * @param lineNumber The line number to check
     * @returns True if the line is part of a code block, false otherwise
     */
    private isLineInCodeBlock(lineNumber: number): boolean {
        return this.codeBlocks.some(block => 
            lineNumber > block.startLine && lineNumber < block.endLine
        );
    }
    
    /**
     * Detect all code blocks in the document
     * @param view The CodeMirror editor view
     * @returns An array of code blocks
     */
    private detectCodeBlocks(view: EditorView): CodeBlock[] {
        const { state } = view;
        const { doc } = state;
        const codeBlocks: CodeBlock[] = [];
        
        let inCodeBlock = false;
        let codeBlockStart = 0;
        let codeBlockStartPos = 0;
        let codeBlockLanguage = '';
        let codeBlockContent = '';
        
        // Process each line in the document
        for (let i = 1; i <= doc.lines; i++) {
            const line = doc.line(i);
            const lineText = line.text;
            
            // Match code fence markers: ``` optionally followed by a language identifier
            const codeFenceMatch = lineText.match(/^(\s*```([a-zA-Z0-9_+#-]*)\s*)$/);
            
            if (codeFenceMatch) {
                if (!inCodeBlock) {
                    // Start of code block
                    inCodeBlock = true;
                    codeBlockStart = i;
                    codeBlockStartPos = line.from;
                    codeBlockLanguage = codeFenceMatch[2] ? codeFenceMatch[2].trim() : '';
                    codeBlockContent = '';
                } else {
                    // End of code block
                    inCodeBlock = false;
                    codeBlocks.push({
                        startLine: codeBlockStart,
                        endLine: i,
                        startPos: codeBlockStartPos,
                        endPos: line.to,
                        language: codeBlockLanguage,
                        content: codeBlockContent
                    });
                    
                    // Reset code block tracking
                    codeBlockStart = 0;
                    codeBlockLanguage = '';
                    codeBlockContent = '';
                }
            } else if (inCodeBlock) {
                // Inside code block content
                codeBlockContent += lineText + '\n';
            }
        }
        
        // Handle any unclosed code blocks by closing them at the end of the document
        if (inCodeBlock && codeBlockStart > 0) {
            codeBlocks.push({
                startLine: codeBlockStart,
                endLine: doc.lines,
                startPos: codeBlockStartPos,
                endPos: doc.line(doc.lines).to,
                language: codeBlockLanguage,
                content: codeBlockContent
            });
        }
        
        return codeBlocks;
    }
    
    /**
     * Detect list markers in a line
     * @param line The line to check
     * @param decorations The array of decorations to add to
     */
    private detectListMarkers(line: any, decorations: SortableDecoration[]): void {
        const lineText = line.text;

        // Match unordered list markers: -, *, + followed by a space
        const unorderedListMatch = lineText.match(/^(\s*)([-*+])\s/);
        if (unorderedListMatch) {
            const indentation = unorderedListMatch[1];
            const marker = unorderedListMatch[2];
            const markerStart = line.from + indentation.length;
            const markerEnd = markerStart + marker.length;

            // Add decoration for the list marker
            decorations.push({
                from: markerStart,
                to: markerEnd,
                decoration: Decoration.mark({
                    class: 'cm-formatting cm-formatting-list',
                    attributes: { 'data-formatting-type': 'list' }
                }),
                priority: 20,
                source: this.config.id
            });

            // Check if this is a task list item
            const taskMatch = lineText.match(/^\s*[-*+]\s+\[([ xX])\]/);
            if (taskMatch) {
                const checkboxStart = markerEnd + 1; // +1 for the space after the marker
                const checkboxEnd = checkboxStart + 3; // [x] is 3 chars
                const isChecked = taskMatch[1].toLowerCase() === 'x';

                // Add decoration for the task checkbox
                decorations.push({
                    from: checkboxStart,
                    to: checkboxEnd,
                    decoration: Decoration.mark({
                        class: `cm-formatting cm-formatting-task ${isChecked ? 'cm-formatting-task-checked' : ''}`,
                        attributes: {
                            'data-formatting-type': 'task',
                            'data-task-state': isChecked ? 'checked' : 'unchecked'
                        }
                    }),
                    priority: 20,
                    source: this.config.id
                });
            }
        }
        
        // Match ordered list markers: number followed by a dot and a space
        const orderedListMatch = lineText.match(/^(\s*)(\d+)\.(\s+)/);
        if (orderedListMatch) {
            const indentation = orderedListMatch[1];
            const number = orderedListMatch[2];
            const markerStart = line.from + indentation.length;
            const markerEnd = markerStart + number.length + 1; // +1 for the dot

            // Add decoration for the list marker
            decorations.push({
                from: markerStart,
                to: markerEnd,
                decoration: Decoration.mark({
                    class: 'cm-formatting cm-formatting-list cm-formatting-list-ol',
                    attributes: { 'data-formatting-type': 'list-ol' }
                }),
                priority: 20,
                source: this.config.id
            });
        }
    }
    
    /**
     * Detect blockquotes in a line
     * @param line The line to check
     * @param decorations The array of decorations to add to
     */
    private detectBlockquotes(line: any, decorations: SortableDecoration[]): void {
        // Match blockquotes: > followed by a space
        const blockquoteMatch = line.text.match(/^>\s/);

        if (blockquoteMatch) {
            const blockquoteStart = line.from;
            const blockquoteEnd = line.from + blockquoteMatch[0].length;

            // Add decoration for blockquote marker
            decorations.push({
                from: blockquoteStart,
                to: blockquoteEnd,
                decoration: Decoration.mark({
                    class: 'cm-formatting cm-formatting-blockquote',
                    attributes: { 'data-formatting-type': 'blockquote' }
                }),
                priority: 20,
                source: this.config.id
            });

            // Add decoration for blockquote content
            decorations.push({
                from: blockquoteEnd,
                to: line.to,
                decoration: Decoration.mark({
                    class: 'cm-quote',
                    attributes: { 'data-formatting-type': 'blockquote-content' }
                }),
                priority: 20,
                source: this.config.id
            });
            
            // Add line decoration for the entire blockquote line
            decorations.push({
                from: line.from,
                to: line.from,
                decoration: Decoration.line({
                    class: 'cm-blockquote-line'
                }),
                priority: 10, // Lower priority than the marker and content
                source: this.config.id
            });
        }
    }
    
    /**
     * Detect horizontal rules in a line
     * @param line The line to check
     * @param decorations The array of decorations to add to
     */
    private detectHorizontalRules(line: any, decorations: SortableDecoration[]): void {
        // Match horizontal rules: ---, ***, or ___ (at least 3 characters)
        const hrMatch = line.text.match(/^\s*([-*_])\1{2,}\s*$/);

        if (hrMatch) {
            // Add decoration for the entire horizontal rule line
            decorations.push({
                from: line.from,
                to: line.to,
                decoration: Decoration.mark({
                    class: 'cm-formatting cm-formatting-hr',
                    attributes: { 'data-formatting-type': 'horizontal-rule' }
                }),
                priority: 20,
                source: this.config.id
            });
            
            // Add line decoration for the horizontal rule line
            decorations.push({
                from: line.from,
                to: line.from,
                decoration: Decoration.line({
                    class: 'cm-horizontal-rule-line'
                }),
                priority: 10, // Lower priority than the marker
                source: this.config.id
            });
        }
    }
    
    /**
     * Detect bold formatting in a line
     * @param line The line to check
     * @param lineText The text of the line
     * @param decorations The array of decorations to add to
     * @param isActive Whether the line is active
     */
    private detectBoldFormatting(line: any, lineText: string, decorations: SortableDecoration[], isActive: boolean): void {
        // Match bold formatting: ** or __ (not preceded by a backslash)
        const boldRegex = /(?<!\\)(\*\*|__)(.*?)(?<!\\)(\1)/g;
        let match;

        while ((match = boldRegex.exec(lineText)) !== null) {
            const fullMatch = match[0];
            const marker = match[1]; // ** or __
            
            // Add decoration for opening marker
            decorations.push({
                from: line.from + match.index,
                to: line.from + match.index + marker.length,
                decoration: Decoration.mark({
                    class: 'cm-formatting cm-formatting-strong',
                    attributes: { 'data-formatting-type': 'bold' }
                }),
                priority: 20,
                source: this.config.id
            });
            
            // Add decoration for content
            decorations.push({
                from: line.from + match.index + marker.length,
                to: line.from + match.index + fullMatch.length - marker.length,
                decoration: Decoration.mark({
                    class: 'cm-strong',
                    attributes: { 'data-formatting-type': 'bold-content' }
                }),
                priority: 20,
                source: this.config.id
            });
            
            // Add decoration for closing marker
            decorations.push({
                from: line.from + match.index + fullMatch.length - marker.length,
                to: line.from + match.index + fullMatch.length,
                decoration: Decoration.mark({
                    class: 'cm-formatting cm-formatting-strong',
                    attributes: { 'data-formatting-type': 'bold' }
                }),
                priority: 20,
                source: this.config.id
            });
        }
    }
    
    /**
     * Detect italic formatting in a line
     * @param line The line to check
     * @param lineText The text of the line
     * @param decorations The array of decorations to add to
     * @param isActive Whether the line is active
     */
    private detectItalicFormatting(line: any, lineText: string, decorations: SortableDecoration[], isActive: boolean): void {
        // Match italic formatting: * or _ (not preceded by a backslash, not part of bold)
        const italicRegex = /(?<!\\|\*|_)(\*|_)(.*?)(?<!\\)(\1)(?!\1)/g;
        let match;

        while ((match = italicRegex.exec(lineText)) !== null) {
            const fullMatch = match[0];
            const marker = match[1]; // * or _
            
            // Add decoration for opening marker
            decorations.push({
                from: line.from + match.index,
                to: line.from + match.index + marker.length,
                decoration: Decoration.mark({
                    class: 'cm-formatting cm-formatting-em',
                    attributes: { 'data-formatting-type': 'italic' }
                }),
                priority: 20,
                source: this.config.id
            });
            
            // Add decoration for content
            decorations.push({
                from: line.from + match.index + marker.length,
                to: line.from + match.index + fullMatch.length - marker.length,
                decoration: Decoration.mark({
                    class: 'cm-em',
                    attributes: { 'data-formatting-type': 'italic-content' }
                }),
                priority: 20,
                source: this.config.id
            });
            
            // Add decoration for closing marker
            decorations.push({
                from: line.from + match.index + fullMatch.length - marker.length,
                to: line.from + match.index + fullMatch.length,
                decoration: Decoration.mark({
                    class: 'cm-formatting cm-formatting-em',
                    attributes: { 'data-formatting-type': 'italic' }
                }),
                priority: 20,
                source: this.config.id
            });
        }
    }
    
    /**
     * Detect inline code formatting in a line
     * @param line The line to check
     * @param lineText The text of the line
     * @param decorations The array of decorations to add to
     */
    private detectInlineCodeFormatting(line: any, lineText: string, decorations: SortableDecoration[]): void {
        // Match inline code formatting: `
        const inlineCodeRegex = /`([^`]+)`/g;
        let match;

        while ((match = inlineCodeRegex.exec(lineText)) !== null) {
            const fullMatch = match[0];
            
            // Add decoration for opening marker
            decorations.push({
                from: line.from + match.index,
                to: line.from + match.index + 1,
                decoration: Decoration.mark({
                    class: 'cm-formatting cm-formatting-code',
                    attributes: { 'data-formatting-type': 'inline-code' }
                }),
                priority: 20,
                source: this.config.id
            });
            
            // Add decoration for content
            decorations.push({
                from: line.from + match.index + 1,
                to: line.from + match.index + fullMatch.length - 1,
                decoration: Decoration.mark({
                    class: 'cm-inline-code',
                    attributes: { 'data-formatting-type': 'inline-code-content' }
                }),
                priority: 20,
                source: this.config.id
            });
            
            // Add decoration for closing marker
            decorations.push({
                from: line.from + match.index + fullMatch.length - 1,
                to: line.from + match.index + fullMatch.length,
                decoration: Decoration.mark({
                    class: 'cm-formatting cm-formatting-code',
                    attributes: { 'data-formatting-type': 'inline-code' }
                }),
                priority: 20,
                source: this.config.id
            });
        }
    }
    
    /**
     * Detect strikethrough formatting in a line
     * @param line The line to check
     * @param lineText The text of the line
     * @param decorations The array of decorations to add to
     */
    private detectStrikethroughFormatting(line: any, lineText: string, decorations: SortableDecoration[]): void {
        // Match strikethrough formatting: ~~
        const strikethroughRegex = /~~(.*?)~~/g;
        let match;

        while ((match = strikethroughRegex.exec(lineText)) !== null) {
            const fullMatch = match[0];
            
            // Add decoration for opening marker
            decorations.push({
                from: line.from + match.index,
                to: line.from + match.index + 2,
                decoration: Decoration.mark({
                    class: 'cm-formatting cm-formatting-strikethrough',
                    attributes: { 'data-formatting-type': 'strikethrough' }
                }),
                priority: 20,
                source: this.config.id
            });
            
            // Add decoration for content
            decorations.push({
                from: line.from + match.index + 2,
                to: line.from + match.index + fullMatch.length - 2,
                decoration: Decoration.mark({
                    class: 'cm-strikethrough',
                    attributes: { 'data-formatting-type': 'strikethrough-content' }
                }),
                priority: 20,
                source: this.config.id
            });
            
            // Add decoration for closing marker
            decorations.push({
                from: line.from + match.index + fullMatch.length - 2,
                to: line.from + match.index + fullMatch.length,
                decoration: Decoration.mark({
                    class: 'cm-formatting cm-formatting-strikethrough',
                    attributes: { 'data-formatting-type': 'strikethrough' }
                }),
                priority: 20,
                source: this.config.id
            });
        }
    }
    
    /**
     * Detect highlight formatting in a line
     * @param line The line to check
     * @param lineText The text of the line
     * @param decorations The array of decorations to add to
     */
    private detectHighlightFormatting(line: any, lineText: string, decorations: SortableDecoration[]): void {
        // Match highlight formatting: ==
        const highlightRegex = /==(.*?)==/g;
        let match;

        while ((match = highlightRegex.exec(lineText)) !== null) {
            const fullMatch = match[0];
            
            // Add decoration for opening marker
            decorations.push({
                from: line.from + match.index,
                to: line.from + match.index + 2,
                decoration: Decoration.mark({
                    class: 'cm-formatting cm-formatting-highlight',
                    attributes: { 'data-formatting-type': 'highlight' }
                }),
                priority: 20,
                source: this.config.id
            });
            
            // Add decoration for content
            decorations.push({
                from: line.from + match.index + 2,
                to: line.from + match.index + fullMatch.length - 2,
                decoration: Decoration.mark({
                    class: 'cm-highlight',
                    attributes: { 'data-formatting-type': 'highlight-content' }
                }),
                priority: 20,
                source: this.config.id
            });
            
            // Add decoration for closing marker
            decorations.push({
                from: line.from + match.index + fullMatch.length - 2,
                to: line.from + match.index + fullMatch.length,
                decoration: Decoration.mark({
                    class: 'cm-formatting cm-formatting-highlight',
                    attributes: { 'data-formatting-type': 'highlight' }
                }),
                priority: 20,
                source: this.config.id
            });
        }
    }
    
    /**
     * Detect links and images in a line
     * @param line The line to check
     * @param decorations The array of decorations to add to
     */
    private detectLinksAndImages(line: any, decorations: SortableDecoration[]): void {
        const lineText = line.text;
        
        // Detect links
        this.detectLinks(line, lineText, decorations);
        
        // Detect images
        this.detectImages(line, lineText, decorations);
    }
    
    /**
     * Detect links in a line
     * @param line The line to check
     * @param lineText The text of the line
     * @param decorations The array of decorations to add to
     */
    private detectLinks(line: any, lineText: string, decorations: SortableDecoration[]): void {
        // Match links: [text](url)
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        let match;

        while ((match = linkRegex.exec(lineText)) !== null) {
            const fullMatch = match[0];
            const text = match[1];
            
            // Add decoration for opening [
            decorations.push({
                from: line.from + match.index,
                to: line.from + match.index + 1,
                decoration: Decoration.mark({
                    class: 'cm-formatting cm-formatting-link',
                    attributes: { 'data-formatting-type': 'link' }
                }),
                priority: 20,
                source: this.config.id
            });
            
            // Add decoration for link text
            decorations.push({
                from: line.from + match.index + 1,
                to: line.from + match.index + text.length + 1,
                decoration: Decoration.mark({
                    class: 'cm-link',
                    attributes: { 'data-formatting-type': 'link-text' }
                }),
                priority: 20,
                source: this.config.id
            });
            
            // Add decoration for closing ]
            decorations.push({
                from: line.from + match.index + text.length + 1,
                to: line.from + match.index + text.length + 2,
                decoration: Decoration.mark({
                    class: 'cm-formatting cm-formatting-link',
                    attributes: { 'data-formatting-type': 'link' }
                }),
                priority: 20,
                source: this.config.id
            });
            
            // Add decoration for opening (
            decorations.push({
                from: line.from + match.index + text.length + 2,
                to: line.from + match.index + text.length + 3,
                decoration: Decoration.mark({
                    class: 'cm-formatting cm-formatting-link',
                    attributes: { 'data-formatting-type': 'link' }
                }),
                priority: 20,
                source: this.config.id
            });
            
            // Add decoration for link URL
            decorations.push({
                from: line.from + match.index + text.length + 3,
                to: line.from + match.index + fullMatch.length - 1,
                decoration: Decoration.mark({
                    class: 'cm-link-url',
                    attributes: { 'data-formatting-type': 'link-url' }
                }),
                priority: 20,
                source: this.config.id
            });
            
            // Add decoration for closing )
            decorations.push({
                from: line.from + match.index + fullMatch.length - 1,
                to: line.from + match.index + fullMatch.length,
                decoration: Decoration.mark({
                    class: 'cm-formatting cm-formatting-link',
                    attributes: { 'data-formatting-type': 'link' }
                }),
                priority: 20,
                source: this.config.id
            });
        }
    }
    
    /**
     * Detect images in a line
     * @param line The line to check
     * @param lineText The text of the line
     * @param decorations The array of decorations to add to
     */
    private detectImages(line: any, lineText: string, decorations: SortableDecoration[]): void {
        // Match images: ![alt](url)
        const imageRegex = /!\[([^\]]+)\]\(([^)]+)\)/g;
        let match;

        while ((match = imageRegex.exec(lineText)) !== null) {
            const fullMatch = match[0];
            const alt = match[1];
            // const url = match[2]; // Unused but kept for clarity
            
            // Add decoration for opening !
            decorations.push({
                from: line.from + match.index,
                to: line.from + match.index + 1,
                decoration: Decoration.mark({
                    class: 'cm-formatting cm-formatting-image',
                    attributes: { 'data-formatting-type': 'image' }
                }),
                priority: 20,
                source: this.config.id
            });
            
            // Add decoration for opening [
            decorations.push({
                from: line.from + match.index + 1,
                to: line.from + match.index + 2,
                decoration: Decoration.mark({
                    class: 'cm-formatting cm-formatting-image',
                    attributes: { 'data-formatting-type': 'image' }
                }),
                priority: 20,
                source: this.config.id
            });
            
            // Add decoration for alt text
            decorations.push({
                from: line.from + match.index + 2,
                to: line.from + match.index + alt.length + 2,
                decoration: Decoration.mark({
                    class: 'cm-image-alt',
                    attributes: { 'data-formatting-type': 'image-alt' }
                }),
                priority: 20,
                source: this.config.id
            });
            
            // Add decoration for closing ]
            decorations.push({
                from: line.from + match.index + alt.length + 2,
                to: line.from + match.index + alt.length + 3,
                decoration: Decoration.mark({
                    class: 'cm-formatting cm-formatting-image',
                    attributes: { 'data-formatting-type': 'image' }
                }),
                priority: 20,
                source: this.config.id
            });
            
            // Add decoration for opening (
            decorations.push({
                from: line.from + match.index + alt.length + 3,
                to: line.from + match.index + alt.length + 4,
                decoration: Decoration.mark({
                    class: 'cm-formatting cm-formatting-image',
                    attributes: { 'data-formatting-type': 'image' }
                }),
                priority: 20,
                source: this.config.id
            });
            
            // Add decoration for image URL
            decorations.push({
                from: line.from + match.index + alt.length + 4,
                to: line.from + match.index + fullMatch.length - 1,
                decoration: Decoration.mark({
                    class: 'cm-image-url',
                    attributes: { 'data-formatting-type': 'image-url' }
                }),
                priority: 20,
                source: this.config.id
            });
            
            // Add decoration for closing )
            decorations.push({
                from: line.from + match.index + fullMatch.length - 1,
                to: line.from + match.index + fullMatch.length,
                decoration: Decoration.mark({
                    class: 'cm-formatting cm-formatting-image',
                    attributes: { 'data-formatting-type': 'image' }
                }),
                priority: 20,
                source: this.config.id
            });
        }
    }
    
    /**
     * Add decorations for code blocks
     * @param view The CodeMirror editor view
     * @param decorations The array of decorations to add to
     */
    private addCodeBlockDecorations(view: EditorView, decorations: SortableDecoration[]): void {
        const { state } = view;
        const activeLine = getActiveLine(view);
        
        // Process code blocks
        for (const block of this.codeBlocks) {
            try {
                // Add line decorations for code blocks
                for (let i = block.startLine; i <= block.endLine; i++) {
                    const line = state.doc.line(i);
                    const isActiveLine = i === activeLine;

                    if (i === block.startLine) {
                        // Start of code block - add line decoration first
                        decorations.push({
                            from: line.from,
                            to: line.from,
                            decoration: Decoration.line({
                                class: `cm-code-block-start${block.language ? ` language-${block.language}` : ''}${isActiveLine ? ' cm-activeLine' : ''}`
                            }),
                            priority: 50,
                            source: this.config.id
                        });

                        // Add mark decoration for the code fence itself
                        const fenceMatch = line.text.match(/^(\s*```([a-zA-Z0-9_+#-]*)\s*)$/);
                        if (fenceMatch) {
                            const fullMatch = fenceMatch[1];
                            decorations.push({
                                from: line.from,
                                to: line.from + fullMatch.length,
                                decoration: Decoration.mark({
                                    class: 'cm-formatting cm-formatting-code-block-start',
                                    attributes: {
                                        'data-formatting-type': 'code-fence-start',
                                        'data-language': block.language || ''
                                    }
                                }),
                                priority: 55,
                                source: this.config.id
                            });
                        }
                        
                        // Add language indicator if a language is specified
                        if (block.language) {
                            decorations.push({
                                from: line.from,
                                to: line.from,
                                decoration: Decoration.widget({
                                    widget: new LanguageIndicatorWidget(block.language),
                                    side: 1
                                }),
                                priority: 60,
                                source: this.config.id
                            });
                        }

                        // Add copy button
                        decorations.push({
                            from: line.from,
                            to: line.from,
                            decoration: Decoration.widget({
                                widget: new CopyButtonWidget(block.content),
                                side: 2
                            }),
                            priority: 70,
                            source: this.config.id
                        });
                    } else if (i === block.endLine) {
                        // End of code block
                        decorations.push({
                            from: line.from,
                            to: line.from,
                            decoration: Decoration.line({
                                class: `cm-code-block-end${isActiveLine ? ' cm-activeLine' : ''}`
                            }),
                            priority: 50,
                            source: this.config.id
                        });

                        // Add mark decoration for the code fence itself
                        const fenceMatch = line.text.match(/^(\s*```\s*)$/);
                        if (fenceMatch) {
                            const fullMatch = fenceMatch[1];
                            decorations.push({
                                from: line.from,
                                to: line.from + fullMatch.length,
                                decoration: Decoration.mark({
                                    class: 'cm-formatting cm-formatting-code-block-end',
                                    attributes: { 'data-formatting-type': 'code-fence-end' }
                                }),
                                priority: 55,
                                source: this.config.id
                            });
                        }
                    } else {
                        // Middle of code block
                        decorations.push({
                            from: line.from,
                            to: line.from,
                            decoration: Decoration.line({
                                class: `cm-code-block-content${isActiveLine ? ' cm-activeLine' : ''}`
                            }),
                            priority: 50,
                            source: this.config.id
                        });
                    }
                }
            } catch (error) {
                console.error(`[UnifiedFormattingExtension] Error processing code block:`, error);
            }
        }
    }

    /**
     * Create extensions for the editor
     * @returns An array of extensions
     */
    createExtensions(): Extension[] {
        return [
            EditorView.baseTheme({
                // --- General Formatting Markers ---
                '.cm-formatting': {
                    display: 'none', // Hide all formatting markers by default
                    color: 'var(--text-faint)',
                    opacity: '0.8'
                },
                
                // Show non-header formatting markers on active line
                '.cm-line.cm-activeLine .cm-formatting:not(.cm-formatting-header)': {
                    display: 'inline'
                },
                
                // Always hide header formatting markers, even on active lines
                '.cm-formatting-header': {
                    display: 'none !important'
                },
                
                // --- Headers ---
                '.cm-header': {
                    fontFamily: 'var(--font-heading, var(--font-text))',
                    fontWeight: 'bold',
                    lineHeight: '1.3',
                    letterSpacing: '-0.01em',
                    color: 'var(--text-heading, var(--text-normal))'
                },
                
                '.cm-header-1': { fontSize: '1.8em' },
                '.cm-header-2': { fontSize: '1.6em' },
                '.cm-header-3': { fontSize: '1.4em' },
                '.cm-header-4': { fontSize: '1.2em' },
                '.cm-header-5': { fontSize: '1.1em' },
                '.cm-header-6': { fontSize: '1em' },
                
                '.cm-header-line': {
                    marginTop: '0.8em',
                    marginBottom: '0.3em',
                    fontWeight: '500'
                },
                
                // --- Bold and Italic ---
                '.cm-strong': {
                    fontWeight: 'bold',
                    color: 'var(--text-strong)'
                },
                
                '.cm-em': {
                    fontStyle: 'italic',
                    color: 'var(--text-em)'
                },
                
                // --- Inline Code ---
                '.cm-inline-code': {
                    fontFamily: 'var(--font-monospace)',
                    backgroundColor: 'var(--code-background)',
                    padding: '0.1em 0.2em',
                    borderRadius: '3px',
                    fontSize: '0.9em'
                },
                
                // --- Strikethrough ---
                '.cm-strikethrough': {
                    textDecoration: 'line-through',
                    color: 'var(--text-faint)'
                },
                
                // --- Highlight ---
                '.cm-highlight': {
                    backgroundColor: 'var(--text-highlight-bg)',
                    color: 'var(--text-normal)'
                },
                
                // --- Links ---
                '.cm-link': {
                    color: 'var(--text-accent)',
                    textDecoration: 'none'
                },
                
                '.cm-link-url': {
                    color: 'var(--text-faint)',
                    textDecoration: 'none'
                },
                
                // --- Images ---
                '.cm-image-alt': {
                    color: 'var(--text-accent)',
                    fontStyle: 'italic'
                },
                
                '.cm-image-url': {
                    color: 'var(--text-faint)',
                    textDecoration: 'none'
                },
                
                // --- Lists ---
                '.cm-formatting-list': {
                    color: 'var(--text-accent)'
                },
                
                '.cm-formatting-task': {
                    color: 'var(--text-accent)'
                },
                
                '.cm-formatting-task-checked': {
                    color: 'var(--text-success)'
                },
                
                // --- Blockquotes ---
                '.cm-blockquote-line': {
                    borderLeft: '4px solid var(--blockquote-border)',
                    paddingLeft: '1em',
                    fontStyle: 'italic'
                },
                
                '.cm-quote': {
                    color: 'var(--text-normal)',
                    fontStyle: 'italic'
                },
                
                // --- Horizontal Rules ---
                '.cm-horizontal-rule-line': {
                    textAlign: 'center'
                },
                
                '.cm-formatting-hr': {
                    color: 'var(--text-faint)',
                    textAlign: 'center'
                },
                
                // --- Code Blocks ---
                '.cm-line.cm-code-block-start': {
                    fontFamily: 'var(--font-monospace)',
                    backgroundColor: 'var(--code-background)',
                    borderTopLeftRadius: '6px',
                    borderTopRightRadius: '6px',
                    padding: '8px 16px',
                    marginTop: '16px'
                },
                
                '.cm-line.cm-code-block-content': {
                    fontFamily: 'var(--font-monospace)',
                    backgroundColor: 'var(--code-background)',
                    padding: '0 16px',
                    whiteSpace: 'pre-wrap'
                },
                
                '.cm-line.cm-code-block-end': {
                    fontFamily: 'var(--font-monospace)',
                    backgroundColor: 'var(--code-background)',
                    borderBottomLeftRadius: '6px',
                    borderBottomRightRadius: '6px',
                    padding: '0 16px 8px',
                    marginBottom: '16px'
                },
                
                // --- Language Indicator ---
                '.code-block-language': {
                    position: 'absolute',
                    top: '8px',
                    right: '44px',
                    fontSize: 'var(--font-size-smallest, 0.75em)',
                    padding: '2px 8px',
                    borderRadius: 'var(--border-radius, 4px)',
                    backgroundColor: 'var(--interactive-accent-hover, rgba(94, 129, 172, 0.8))',
                    color: 'var(--text-on-accent, white)',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    opacity: '0.9',
                    transition: 'opacity 0.2s ease',
                    border: '1px solid var(--background-modifier-border)',
                    zIndex: '10'
                },
                
                // --- Copy Button ---
                '.code-block-copy-button': {
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '28px',
                    height: '28px',
                    padding: '4px',
                    backgroundColor: 'var(--background-secondary)',
                    border: '1px solid var(--background-modifier-border)',
                    borderRadius: 'var(--border-radius, 4px)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    opacity: '0.8',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: '10'
                },
                
                '.code-block-copy-button:hover': {
                    opacity: '1',
                    backgroundColor: 'var(--background-modifier-hover)'
                },
                
                '.code-block-copy-button.copied': {
                    backgroundColor: 'var(--interactive-accent)',
                    color: 'var(--text-on-accent)'
                }
            })
        ];
    }
}
