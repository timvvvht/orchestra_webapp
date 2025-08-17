/**
 * Unified Formatting System for CodeMirror 6
 * 
 * This file implements a comprehensive formatting system for Markdown editing,
 * providing a clean reading view with hidden formatting characters and an
 * informative editing view when the cursor is on a line.
 */

import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { RangeSetBuilder, Extension, StateField, StateEffect } from '@codemirror/state';

/**
 * Enum defining all supported formatting types
 */
export enum FormattingType {
  // Headers
  HEADER_HASH,      // # at the beginning of headers
  HEADER_TEXT,      // The text content of headers
  
  // Inline formatting
  BOLD_MARKER,      // ** or __ markers
  ITALIC_MARKER,    // * or _ markers
  STRIKETHROUGH_MARKER, // ~~ markers
  INLINE_CODE_MARKER,   // ` markers
  INLINE_CODE_CONTENT,  // Content between ` markers
  
  // Code blocks
  CODE_FENCE,       // ``` markers
  CODE_BLOCK_CONTENT, // Content inside code blocks
  
  // Lists
  LIST_MARKER,      // -, *, + or 1. markers
  TASK_MARKER,      // [ ] or [x] markers
  
  // Links and images
  LINK_MARKER,      // []() markers
  IMAGE_MARKER,     // ![]() markers
  
  // Blockquotes
  BLOCKQUOTE_MARKER, // > markers
  
  // Tables
  TABLE_SEPARATOR,  // | and --- markers in tables
  
  // Other
  HORIZONTAL_RULE,  // ---, ***, ___ markers
}

/**
 * Interface for formatting range information
 */
export interface FormattingRange {
  from: number;      // Start position in the document
  to: number;        // End position in the document
  type: FormattingType; // Type of formatting
  level?: number;    // For headers, lists, etc.
  language?: string; // For code blocks
  content?: string;  // For code blocks, links, etc.
  isActive?: boolean; // Whether this range is on the active line
}

/**
 * Interface for code block information
 */
interface CodeBlock {
  startLine: number;
  endLine: number;
  startPos: number;
  endPos: number;
  language: string;
  content: string;
}

/**
 * Class for language indicator widget in code blocks
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
 * Class for copy button widget in code blocks
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
    button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
    button.title = 'Copy code';
    
    // Add click event listener to copy the code
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Copy the code to clipboard
      navigator.clipboard.writeText(this.codeContent.trim()).then(() => {
        // Visual feedback
        button.classList.add('copied');
        button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        
        // Reset after 1.5 seconds
        setTimeout(() => {
          button.classList.remove('copied');
          button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
        }, 1500);
      });
    });

    return button;
  }
}

/**
 * The core unified formatting plugin
 */
export const unifiedFormattingPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    codeBlocks: CodeBlock[] = [];
    
    constructor(view: EditorView) {
      this.codeBlocks = this.detectCodeBlocks(view);
      this.decorations = this.buildDecorations(view);
    }
    
    update(update: ViewUpdate) {
      console.log('[UnifiedFormatting] Update triggered', {
        docChanged: update.docChanged,
        viewportChanged: update.viewportChanged,
        selectionSet: update.selectionSet,
        selectionMain: update.state.selection.main.head,
        activeLine: update.state.doc.lineAt(update.state.selection.main.head).number
      });
      
      if (update.docChanged) {
        // Recalculate code blocks when document changes
        this.codeBlocks = this.detectCodeBlocks(update.view);
        console.log('[UnifiedFormatting] Code blocks detected:', this.codeBlocks.length);
        this.decorations = this.buildDecorations(update.view);
      } else if (update.viewportChanged || update.selectionSet) {
        console.log('[UnifiedFormatting] Rebuilding decorations due to viewport or selection change');
        this.decorations = this.buildDecorations(update.view);
      }
    }
    
    /**
     * Detect all code blocks in the document
     */
    detectCodeBlocks(view: EditorView): CodeBlock[] {
      const { state } = view;
      const { doc } = state;
      const codeBlocks: CodeBlock[] = [];
      
      let inCodeBlock = false;
      let codeBlockStart = -1;
      let codeBlockStartPos = -1;
      let codeBlockLanguage = '';
      let codeBlockContent = '';
      
      // Process each line in the document
      for (let i = 1; i <= doc.lines; i++) {
        const line = doc.line(i);
        const lineText = line.text;
        
        // Check for code fence markers
        const isCodeFence = /^\s*```([a-zA-Z0-9_+#-]*)\s*$/.test(lineText);
        
        if (isCodeFence && !inCodeBlock) {
          // Start of code block
          inCodeBlock = true;
          codeBlockStart = i;
          codeBlockStartPos = line.from;
          
          // Extract language if specified
          const match = lineText.match(/^\s*```([a-zA-Z0-9_+#-]*)\s*$/);
          codeBlockLanguage = match && match[1] ? match[1].trim() : '';
          
          // Reset code block content
          codeBlockContent = '';
        } 
        else if (isCodeFence && inCodeBlock) {
          // End of code block
          inCodeBlock = false;
          
          // Add the code block to our list
          codeBlocks.push({
            startLine: codeBlockStart,
            endLine: i,
            startPos: codeBlockStartPos,
            endPos: line.to,
            language: codeBlockLanguage,
            content: codeBlockContent
          });
          
          // Reset tracking variables
          codeBlockStart = -1;
          codeBlockStartPos = -1;
          codeBlockLanguage = '';
          codeBlockContent = '';
        } 
        else if (inCodeBlock) {
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
     * Check if a line is part of a code block
     */
    isLineInCodeBlock(lineNumber: number): boolean {
      return this.codeBlocks.some(block => 
        lineNumber >= block.startLine && lineNumber <= block.endLine
      );
    }
    
    /**
     * Detect all formatting in the document
     */
    detectFormatting(view: EditorView): FormattingRange[] {
      const { state } = view;
      const { doc } = state;
      const ranges: FormattingRange[] = [];
      
      // Get active line for showing/hiding formatting
      const activeLine = state.doc.lineAt(state.selection.main.head);
      console.log('[UnifiedFormatting] Active line:', {
        number: activeLine.number,
        text: activeLine.text,
        from: activeLine.from,
        to: activeLine.to
      });
      
      // Process each line in the viewport
      for (let { from, to } of view.visibleRanges) {
        let pos = from;
        while (pos <= to) {
          const line = doc.lineAt(pos);
          const lineText = line.text;
          const isActiveLine = line.number === activeLine.number;
          
          // Skip formatting detection for lines within code blocks
          // except for the code fence lines themselves
          const inCodeBlock = this.isLineInCodeBlock(line.number);
          const isCodeFenceLine = /^\s*```([a-zA-Z0-9_+#-]*)\s*$/.test(lineText);
          
          if (!inCodeBlock || isCodeFenceLine) {
            // Detect headers (# to ######)
            this.detectHeaders(line, ranges, isActiveLine);
            
            // Detect code fences (```)
            this.detectCodeFences(line, ranges, isActiveLine);
            
            // Detect list markers
            this.detectListMarkers(line, ranges, isActiveLine);
            
            // Detect inline formatting (bold, italic, etc.)
            this.detectInlineFormatting(line, ranges, isActiveLine);
            
            // Detect links and images
            this.detectLinksAndImages(line, ranges, isActiveLine);
            
            // Detect blockquotes
            this.detectBlockquotes(line, ranges, isActiveLine);
            
            // Detect horizontal rules
            this.detectHorizontalRules(line, ranges, isActiveLine);
          }
          
          pos = line.to + 1;
        }
      }
      
      console.log('[UnifiedFormatting] Detected formatting ranges:', ranges.length);
      // Log a sample of the ranges for debugging
      if (ranges.length > 0) {
        console.log('[UnifiedFormatting] Sample ranges:', ranges.slice(0, 5).map(r => ({
          type: FormattingType[r.type],
          from: r.from,
          to: r.to,
          isActive: r.isActive
        })));
      }
      
      return ranges;
    }
    
    /**
     * Detect headers in a line
     */
    detectHeaders(line: any, ranges: FormattingRange[], isActiveLine: boolean) {
      const lineText = line.text;
      
      // Match headers: # to ###### followed by a space and text
      // More specific to avoid matching Python comments - requires a space after the #s
      const headerMatch = lineText.match(/^(#{1,6})\s+(.+)$/);
      
      if (headerMatch) {
        const hashMarker = headerMatch[1];
        const headerLevel = hashMarker.length; // # = 1, ## = 2, etc.
        const hashEnd = line.from + headerLevel;
        const headerText = headerMatch[2];
        const headerStart = hashEnd + 1; // +1 for the space after the #
        const headerEnd = line.from + headerMatch[0].length;
        
        // Add range for the hash symbols
        ranges.push({
          from: line.from,
          to: hashEnd,
          type: FormattingType.HEADER_HASH,
          level: headerLevel,
          isActive: isActiveLine
        });
        
        // Add range for the header text
        ranges.push({
          from: headerStart,
          to: headerEnd,
          type: FormattingType.HEADER_TEXT,
          level: headerLevel,
          isActive: isActiveLine
        });
      }
    }
    
    /**
     * Detect code fences in a line
     */
    detectCodeFences(line: any, ranges: FormattingRange[], isActiveLine: boolean) {
      const lineText = line.text;
      
      // Match code fence markers: ``` optionally followed by a language identifier
      const codeFenceMatch = lineText.match(/^(\s*```([a-zA-Z0-9_+#-]*)\s*)$/);
      
      if (codeFenceMatch) {
        const fullMatch = codeFenceMatch[1];
        const language = codeFenceMatch[2] ? codeFenceMatch[2].trim() : '';
        
        // Add range for the entire code fence line
        ranges.push({
          from: line.from,
          to: line.from + fullMatch.length,
          type: FormattingType.CODE_FENCE,
          language,
          isActive: isActiveLine
        });
      }
    }
    
    /**
     * Detect list markers in a line
     */
    detectListMarkers(line: any, ranges: FormattingRange[], isActiveLine: boolean) {
      const lineText = line.text;
      
      // Match unordered list markers: -, *, + followed by a space
      const unorderedListMatch = lineText.match(/^(\s*)([-*+])\s/);
      if (unorderedListMatch) {
        const indentation = unorderedListMatch[1];
        const marker = unorderedListMatch[2];
        const markerStart = line.from + indentation.length;
        const markerEnd = markerStart + marker.length;
        
        // Add range for the list marker
        ranges.push({
          from: markerStart,
          to: markerEnd,
          type: FormattingType.LIST_MARKER,
          isActive: isActiveLine
        });
        
        // Check if this is a task list item
        const taskMatch = lineText.match(/^\s*[-*+]\s+\[([ xX])\]/);
        if (taskMatch) {
          const checkboxStart = markerEnd + 1; // +1 for the space after the marker
          const checkboxEnd = checkboxStart + 3; // [x] is 3 chars
          const isChecked = taskMatch[1].toLowerCase() === 'x';
          
          // Add range for the task checkbox
          ranges.push({
            from: checkboxStart,
            to: checkboxEnd,
            type: FormattingType.TASK_MARKER,
            content: isChecked ? 'checked' : 'unchecked',
            isActive: isActiveLine
          });
        }
        
        return; // Don't process further if we found an unordered list marker
      }
      
      // Match ordered list markers: number followed by . and a space
      const orderedListMatch = lineText.match(/^(\s*)(\d+)\.(\s)/);
      if (orderedListMatch) {
        const indentation = orderedListMatch[1];
        const number = orderedListMatch[2];
        const markerStart = line.from + indentation.length;
        const markerEnd = markerStart + number.length + 1; // +1 for the dot
        
        // Add range for the list marker
        ranges.push({
          from: markerStart,
          to: markerEnd,
          type: FormattingType.LIST_MARKER,
          isActive: isActiveLine
        });
        
        // Check if this is a task list item
        const taskMatch = lineText.match(/^\s*\d+\.\s+\[([ xX])\]/);
        if (taskMatch) {
          const checkboxStart = markerEnd + 1; // +1 for the space after the marker
          const checkboxEnd = checkboxStart + 3; // [x] is 3 chars
          const isChecked = taskMatch[1].toLowerCase() === 'x';
          
          // Add range for the task checkbox
          ranges.push({
            from: checkboxStart,
            to: checkboxEnd,
            type: FormattingType.TASK_MARKER,
            content: isChecked ? 'checked' : 'unchecked',
            isActive: isActiveLine
          });
        }
      }
    }
    
    /**
     * Detect inline formatting in a line
     */
    detectInlineFormatting(line: any, ranges: FormattingRange[], isActiveLine: boolean) {
      const lineText = line.text;
      
      // Detect bold formatting: ** or __
      this.detectBoldFormatting(line, lineText, ranges, isActiveLine);
      
      // Detect italic formatting: * or _
      this.detectItalicFormatting(line, lineText, ranges, isActiveLine);
      
      // Detect strikethrough formatting: ~~
      this.detectStrikethroughFormatting(line, lineText, ranges, isActiveLine);
      
      // Detect inline code formatting: `
      this.detectInlineCodeFormatting(line, lineText, ranges, isActiveLine);
    }
    
    /**
     * Detect bold formatting in a line
     */
    detectBoldFormatting(line: any, lineText: string, ranges: FormattingRange[], isActiveLine: boolean) {
      // Match bold formatting: ** or __
      const boldRegex = /\*\*(.*?)\*\*|__(.*?)__/g;
      let match;
      
      while ((match = boldRegex.exec(lineText)) !== null) {
        const fullMatch = match[0];
        const isStar = fullMatch.startsWith('**');
        
        // Add range for opening marker
        ranges.push({
          from: line.from + match.index,
          to: line.from + match.index + 2, // ** or __ is 2 chars
          type: FormattingType.BOLD_MARKER,
          isActive: isActiveLine
        });
        
        // Add range for closing marker
        ranges.push({
          from: line.from + match.index + fullMatch.length - 2,
          to: line.from + match.index + fullMatch.length,
          type: FormattingType.BOLD_MARKER,
          isActive: isActiveLine
        });
      }
    }
    
    /**
     * Detect italic formatting in a line
     */
    detectItalicFormatting(line: any, lineText: string, ranges: FormattingRange[], isActiveLine: boolean) {
      // Match italic formatting: * or _
      // Avoid matching ** or __ which are for bold
      const italicRegex = /(?<!\*)\*(?!\*)(.*?)\*(?!\*)|(?<!_)_(?!_)(.*?)_(?!_)/g;
      let match;
      
      while ((match = italicRegex.exec(lineText)) !== null) {
        const fullMatch = match[0];
        const isStar = fullMatch.startsWith('*');
        
        // Add range for opening marker
        ranges.push({
          from: line.from + match.index,
          to: line.from + match.index + 1, // * or _ is 1 char
          type: FormattingType.ITALIC_MARKER,
          isActive: isActiveLine
        });
        
        // Add range for closing marker
        ranges.push({
          from: line.from + match.index + fullMatch.length - 1,
          to: line.from + match.index + fullMatch.length,
          type: FormattingType.ITALIC_MARKER,
          isActive: isActiveLine
        });
      }
    }
    
    /**
     * Detect strikethrough formatting in a line
     */
    detectStrikethroughFormatting(line: any, lineText: string, ranges: FormattingRange[], isActiveLine: boolean) {
      // Match strikethrough formatting: ~~
      const strikethroughRegex = /~~(.*?)~~/g;
      let match;
      
      while ((match = strikethroughRegex.exec(lineText)) !== null) {
        const fullMatch = match[0];
        
        // Add range for opening marker
        ranges.push({
          from: line.from + match.index,
          to: line.from + match.index + 2, // ~~ is 2 chars
          type: FormattingType.STRIKETHROUGH_MARKER,
          isActive: isActiveLine
        });
        
        // Add range for closing marker
        ranges.push({
          from: line.from + match.index + fullMatch.length - 2,
          to: line.from + match.index + fullMatch.length,
          type: FormattingType.STRIKETHROUGH_MARKER,
          isActive: isActiveLine
        });
      }
    }
    
    /**
     * Detect inline code formatting in a line
     */
    detectInlineCodeFormatting(line: any, lineText: string, ranges: FormattingRange[], isActiveLine: boolean) {
      // Match inline code formatting: `
      const inlineCodeRegex = /`([^`]+)`/g;
      let match;
      
      while ((match = inlineCodeRegex.exec(lineText)) !== null) {
        const fullMatch = match[0];
        
        // Add range for opening marker
        ranges.push({
          from: line.from + match.index,
          to: line.from + match.index + 1, // ` is 1 char
          type: FormattingType.INLINE_CODE_MARKER,
          isActive: isActiveLine
        });
        
        // Add range for closing marker
        ranges.push({
          from: line.from + match.index + fullMatch.length - 1,
          to: line.from + match.index + fullMatch.length,
          type: FormattingType.INLINE_CODE_MARKER,
          isActive: isActiveLine
        });
      }
    }
    
    /**
     * Detect links and images in a line
     */
    detectLinksAndImages(line: any, ranges: FormattingRange[], isActiveLine: boolean) {
      const lineText = line.text;
      
      // Detect links: [text](url)
      this.detectLinks(line, lineText, ranges, isActiveLine);
      
      // Detect images: ![alt](url)
      this.detectImages(line, lineText, ranges, isActiveLine);
    }
    
    /**
     * Detect links in a line
     */
    detectLinks(line: any, lineText: string, ranges: FormattingRange[], isActiveLine: boolean) {
      // Match links: [text](url)
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      let match;
      
      while ((match = linkRegex.exec(lineText)) !== null) {
        const fullMatch = match[0];
        const text = match[1];
        const url = match[2];
        
        // Add range for opening [
        ranges.push({
          from: line.from + match.index,
          to: line.from + match.index + 1,
          type: FormattingType.LINK_MARKER,
          isActive: isActiveLine
        });
        
        // Add range for closing ]
        const closingBracketPos = match.index + text.length + 1;
        ranges.push({
          from: line.from + closingBracketPos,
          to: line.from + closingBracketPos + 1,
          type: FormattingType.LINK_MARKER,
          isActive: isActiveLine
        });
        
        // Add range for opening (
        ranges.push({
          from: line.from + closingBracketPos + 1,
          to: line.from + closingBracketPos + 2,
          type: FormattingType.LINK_MARKER,
          isActive: isActiveLine
        });
        
        // Add range for closing )
        ranges.push({
          from: line.from + match.index + fullMatch.length - 1,
          to: line.from + match.index + fullMatch.length,
          type: FormattingType.LINK_MARKER,
          isActive: isActiveLine
        });
      }
    }
    
    /**
     * Detect images in a line
     */
    detectImages(line: any, lineText: string, ranges: FormattingRange[], isActiveLine: boolean) {
      // Match images: ![alt](url)
      const imageRegex = /!\[([^\]]+)\]\(([^)]+)\)/g;
      let match;
      
      while ((match = imageRegex.exec(lineText)) !== null) {
        const fullMatch = match[0];
        const alt = match[1];
        const url = match[2];
        
        // Add range for opening ![
        ranges.push({
          from: line.from + match.index,
          to: line.from + match.index + 2,
          type: FormattingType.IMAGE_MARKER,
          isActive: isActiveLine
        });
        
        // Add range for closing ]
        const closingBracketPos = match.index + alt.length + 2;
        ranges.push({
          from: line.from + closingBracketPos,
          to: line.from + closingBracketPos + 1,
          type: FormattingType.IMAGE_MARKER,
          isActive: isActiveLine
        });
        
        // Add range for opening (
        ranges.push({
          from: line.from + closingBracketPos + 1,
          to: line.from + closingBracketPos + 2,
          type: FormattingType.IMAGE_MARKER,
          isActive: isActiveLine
        });
        
        // Add range for closing )
        ranges.push({
          from: line.from + match.index + fullMatch.length - 1,
          to: line.from + match.index + fullMatch.length,
          type: FormattingType.IMAGE_MARKER,
          isActive: isActiveLine
        });
      }
    }
    
    /**
     * Detect blockquotes in a line
     */
    detectBlockquotes(line: any, ranges: FormattingRange[], isActiveLine: boolean) {
      const lineText = line.text;
      
      // Match blockquotes: > followed by optional space and text
      const blockquoteMatch = lineText.match(/^(\s*)(>\s?)(.*)$/);
      
      if (blockquoteMatch) {
        const indentation = blockquoteMatch[1];
        const marker = blockquoteMatch[2];
        const markerStart = line.from + indentation.length;
        const markerEnd = markerStart + marker.length;
        
        // Add range for the blockquote marker
        ranges.push({
          from: markerStart,
          to: markerEnd,
          type: FormattingType.BLOCKQUOTE_MARKER,
          isActive: isActiveLine
        });
      }
    }
    
    /**
     * Detect horizontal rules in a line
     */
    detectHorizontalRules(line: any, ranges: FormattingRange[], isActiveLine: boolean) {
      const lineText = line.text;
      
      // Match horizontal rules: ---, ***, or ___ (at least 3 characters)
      const horizontalRuleMatch = lineText.match(/^\s*([-*_])\1{2,}\s*$/);
      
      if (horizontalRuleMatch) {
        // Add range for the entire horizontal rule
        ranges.push({
          from: line.from,
          to: line.to,
          type: FormattingType.HORIZONTAL_RULE,
          isActive: isActiveLine
        });
      }
    }
    
    /**
     * Build decorations from detected formatting
     */
    buildDecorations(view: EditorView): DecorationSet {
      console.log('[UnifiedFormatting] Building decorations');
      const builder = new RangeSetBuilder<Decoration>();
      const formattingRanges = this.detectFormatting(view);
      const activeLine = view.state.doc.lineAt(view.state.selection.main.head);
      
      console.log('[UnifiedFormatting] Active line for decorations:', activeLine.number);
      
      // Collect code block decorations separately
      const codeBlockDecorations: Array<{from: number, to: number, decoration: Decoration}> = [];
      
      // Process code blocks first to add line decorations and widgets
      for (const block of this.codeBlocks) {
        // Add line decorations for code blocks
        for (let i = block.startLine; i <= block.endLine; i++) {
          const line = view.state.doc.line(i);
          const isActiveLine = i === activeLine.number;
          
          if (i === block.startLine) {
            // Start of code block
            const className = `cm-code-block-start${block.language ? ` language-${block.language}` : ''}${isActiveLine ? ' cm-activeLine' : ''}`;
            console.log(`[UnifiedFormatting] Adding code block start decoration: ${className}`);
            codeBlockDecorations.push({
              from: line.from,
              to: line.from,
              decoration: Decoration.line({ class: className })
            });
            
            // Add language indicator if a language is specified
            if (block.language) {
              codeBlockDecorations.push({
                from: line.from,
                to: line.from,
                decoration: Decoration.widget({
                  widget: new LanguageIndicatorWidget(block.language),
                  side: 1
                })
              });
            }
            
            // Add copy button
            codeBlockDecorations.push({
              from: line.from,
              to: line.from,
              decoration: Decoration.widget({
                widget: new CopyButtonWidget(block.content),
                side: 2
              })
            });
          } 
          else if (i === block.endLine) {
            // End of code block
            const className = `cm-code-block-end${isActiveLine ? ' cm-activeLine' : ''}`;
            console.log(`[UnifiedFormatting] Adding code block end decoration: ${className}`);
            codeBlockDecorations.push({
              from: line.from,
              to: line.from,
              decoration: Decoration.line({ class: className })
            });
          } 
          else {
            // Inside code block content
            const className = `cm-code-block-content${block.language ? ` language-${block.language}` : ''}${isActiveLine ? ' cm-activeLine' : ''}`;
            codeBlockDecorations.push({
              from: line.from,
              to: line.from,
              decoration: Decoration.line({
                class: className
              })
            });
          }
        }
      }
      
      // Sort code block decorations by position
      codeBlockDecorations.sort((a, b) => {
        if (a.from !== b.from) return a.from - b.from;
        
        // If from positions are equal, line decorations come before widgets
        const aIsWidget = a.decoration.spec.widget !== undefined;
        const bIsWidget = b.decoration.spec.widget !== undefined;
        
        if (aIsWidget !== bIsWidget) return aIsWidget ? 1 : -1;
        
        // If both are widgets, sort by side
        if (aIsWidget && bIsWidget) {
          const aSide = a.decoration.spec.side || 0;
          const bSide = b.decoration.spec.side || 0;
          return aSide - bSide;
        }
        
        return 0;
      });
      
      // Add all code block decorations to the builder
      for (const { from, to, decoration } of codeBlockDecorations) {
        builder.add(from, to, decoration);
      }
      
      // Collect other formatting decorations separately
      const formattingDecorations: Array<{from: number, to: number, decoration: Decoration}> = [];
      
      // Process other formatting ranges
      let formattingCount = 0;
      for (const range of formattingRanges) {
        // Create appropriate decoration based on type and active state
        const decoration = this.createDecoration(range, range.isActive || false);
        
        if (decoration) {
          formattingDecorations.push({
            from: range.from,
            to: range.to,
            decoration: decoration
          });
          formattingCount++;
        }
      }
      
      // Sort formatting decorations by position
      formattingDecorations.sort((a, b) => {
        if (a.from !== b.from) return a.from - b.from;
        if (a.to !== b.to) return a.to - b.to;
        return 0;
      });
      
      // Add all formatting decorations to the builder
      for (const { from, to, decoration } of formattingDecorations) {
        builder.add(from, to, decoration);
      }
      
      console.log(`[UnifiedFormatting] Added ${formattingCount} formatting decorations`);
      
      // Add a DOM observer to check if CSS classes are being applied correctly
      setTimeout(() => {
        const formattingElements = document.querySelectorAll('.cm-formatting');
        const activeLineFormattingElements = document.querySelectorAll('.cm-line.cm-activeLine .cm-formatting');
        console.log('[UnifiedFormatting] DOM check:', {
          totalFormattingElements: formattingElements.length,
          activeLineFormattingElements: activeLineFormattingElements.length,
          activeLineFormattingVisible: Array.from(activeLineFormattingElements).every(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none';
          }),
          inactiveLineFormattingHidden: Array.from(formattingElements)
            .filter(el => !el.closest('.cm-line.cm-activeLine'))
            .every(el => {
              const style = window.getComputedStyle(el);
              return style.display === 'none';
            })
        });
      }, 100);
      
      return builder.finish();
    }
    
    /**
     * Create appropriate decoration based on formatting type
     */
    createDecoration(range: FormattingRange, isActiveLine: boolean): Decoration | null {
      switch (range.type) {
        case FormattingType.HEADER_HASH:
          return this.createHeaderHashDecoration(range, isActiveLine);
        case FormattingType.HEADER_TEXT:
          return this.createHeaderTextDecoration(range, isActiveLine);
        case FormattingType.BOLD_MARKER:
          return this.createBoldMarkerDecoration(range, isActiveLine);
        case FormattingType.ITALIC_MARKER:
          return this.createItalicMarkerDecoration(range, isActiveLine);
        case FormattingType.STRIKETHROUGH_MARKER:
          return this.createStrikethroughMarkerDecoration(range, isActiveLine);
        case FormattingType.INLINE_CODE_MARKER:
          return this.createInlineCodeMarkerDecoration(range, isActiveLine);
        case FormattingType.CODE_FENCE:
          return this.createCodeFenceDecoration(range, isActiveLine);
        case FormattingType.LIST_MARKER:
          return this.createListMarkerDecoration(range, isActiveLine);
        case FormattingType.TASK_MARKER:
          return this.createTaskMarkerDecoration(range, isActiveLine);
        case FormattingType.LINK_MARKER:
          return this.createLinkMarkerDecoration(range, isActiveLine);
        case FormattingType.IMAGE_MARKER:
          return this.createImageMarkerDecoration(range, isActiveLine);
        case FormattingType.BLOCKQUOTE_MARKER:
          return this.createBlockquoteMarkerDecoration(range, isActiveLine);
        case FormattingType.TABLE_SEPARATOR:
          return this.createTableSeparatorDecoration(range, isActiveLine);
        case FormattingType.HORIZONTAL_RULE:
          return this.createHorizontalRuleDecoration(range, isActiveLine);
        default:
          return null;
      }
    }
    
    /**
     * Create header hash decoration
     */
    createHeaderHashDecoration(range: FormattingRange, isActiveLine: boolean): Decoration | null {
      if (!range.level) return null;
      
      return Decoration.mark({
        class: `cm-formatting cm-formatting-header cm-formatting-header-${range.level}`,
        attributes: { 
          'data-header-hash': 'true',
          'data-header-level': range.level.toString()
        }
      });
    }
    
    /**
     * Create header text decoration
     */
    createHeaderTextDecoration(range: FormattingRange, isActiveLine: boolean): Decoration | null {
      if (!range.level) return null;
      
      return Decoration.mark({
        class: `cm-header cm-header-${range.level}`,
        attributes: { 'data-header-level': range.level.toString() }
      });
    }
    
    /**
     * Create bold marker decoration
     */
    createBoldMarkerDecoration(range: FormattingRange, isActiveLine: boolean): Decoration | null {
      return Decoration.mark({
        class: 'cm-formatting cm-formatting-strong',
        attributes: { 'data-formatting-type': 'bold' }
      });
    }
    
    /**
     * Create italic marker decoration
     */
    createItalicMarkerDecoration(range: FormattingRange, isActiveLine: boolean): Decoration | null {
      return Decoration.mark({
        class: 'cm-formatting cm-formatting-em',
        attributes: { 'data-formatting-type': 'italic' }
      });
    }
    
    /**
     * Create strikethrough marker decoration
     */
    createStrikethroughMarkerDecoration(range: FormattingRange, isActiveLine: boolean): Decoration | null {
      return Decoration.mark({
        class: 'cm-formatting cm-formatting-strikethrough',
        attributes: { 'data-formatting-type': 'strikethrough' }
      });
    }
    
    /**
     * Create inline code marker decoration
     */
    createInlineCodeMarkerDecoration(range: FormattingRange, isActiveLine: boolean): Decoration | null {
      return Decoration.mark({
        class: 'cm-formatting cm-formatting-code',
        attributes: { 'data-formatting-type': 'inline-code' }
      });
    }
    
    /**
     * Create code fence decoration
     */
    createCodeFenceDecoration(range: FormattingRange, isActiveLine: boolean): Decoration | null {
      return Decoration.mark({
        class: 'cm-formatting cm-formatting-code-block',
        attributes: { 
          'data-formatting-type': 'code-fence',
          'data-language': range.language || ''
        }
      });
    }
    
    /**
     * Create list marker decoration
     */
    createListMarkerDecoration(range: FormattingRange, isActiveLine: boolean): Decoration | null {
      return Decoration.mark({
        class: 'cm-formatting cm-formatting-list',
        attributes: { 'data-formatting-type': 'list' }
      });
    }
    
    /**
     * Create task marker decoration
     */
    createTaskMarkerDecoration(range: FormattingRange, isActiveLine: boolean): Decoration | null {
      const isChecked = range.content === 'checked';
      
      return Decoration.mark({
        class: `cm-formatting cm-formatting-task ${isChecked ? 'cm-formatting-task-checked' : ''}`,
        attributes: { 
          'data-formatting-type': 'task',
          'data-task-state': isChecked ? 'checked' : 'unchecked'
        }
      });
    }
    
    /**
     * Create link marker decoration
     */
    createLinkMarkerDecoration(range: FormattingRange, isActiveLine: boolean): Decoration | null {
      return Decoration.mark({
        class: 'cm-formatting cm-formatting-link',
        attributes: { 'data-formatting-type': 'link' }
      });
    }
    
    /**
     * Create image marker decoration
     */
    createImageMarkerDecoration(range: FormattingRange, isActiveLine: boolean): Decoration | null {
      return Decoration.mark({
        class: 'cm-formatting cm-formatting-image',
        attributes: { 'data-formatting-type': 'image' }
      });
    }
    
    /**
     * Create blockquote marker decoration
     */
    createBlockquoteMarkerDecoration(range: FormattingRange, isActiveLine: boolean): Decoration | null {
      return Decoration.mark({
        class: 'cm-formatting cm-formatting-quote',
        attributes: { 'data-formatting-type': 'blockquote' }
      });
    }
    
    /**
     * Create table separator decoration
     */
    createTableSeparatorDecoration(range: FormattingRange, isActiveLine: boolean): Decoration | null {
      return Decoration.mark({
        class: 'cm-formatting cm-formatting-table',
        attributes: { 'data-formatting-type': 'table' }
      });
    }
    
    /**
     * Create horizontal rule decoration
     */
    createHorizontalRuleDecoration(range: FormattingRange, isActiveLine: boolean): Decoration | null {
      return Decoration.mark({
        class: 'cm-formatting cm-formatting-hr',
        attributes: { 'data-formatting-type': 'horizontal-rule' }
      });
    }
  },
  {
    decorations: v => v.decorations,
  }
);

/**
 * Base theme for unified formatting
 */
export const unifiedFormattingTheme = EditorView.baseTheme({
  // Base formatting - hidden by default
  '.cm-formatting': {
    display: 'none',
  },
  
  // Show on active line
  '.cm-line.cm-activeLine .cm-formatting': {
    display: 'inline',
    color: 'var(--text-faint)',
    opacity: 0.7,
  },
  
  // Always show list markers
  '.cm-formatting-list, .cm-formatting-task': {
    display: 'inline',
    color: 'var(--text-normal)',
    opacity: 0.8,
  },
  
  // Task markers
  '.cm-formatting-task-checked': {
    color: 'var(--text-accent)',
  },
  
  // Header styling
  '.cm-header': {
    fontFamily: 'var(--font-heading, var(--font-text))',
    fontWeight: 'bold',
    lineHeight: '1.3',
    letterSpacing: '-0.01em',
    color: 'var(--text-heading, var(--text-normal))',
  },
  
  // Header levels
  '.cm-header-1': { 
    fontSize: '20px', 
    fontWeight: '800', 
    color: 'var(--text-heading-h1, var(--interactive-accent, #5e81ac))',
    borderBottom: '1px solid var(--background-modifier-border)',
    paddingBottom: '0.3em',
    marginTop: '0.5em',
    marginBottom: '0.8em',
    letterSpacing: '-0.02em',
  },
  '.cm-header-2': { 
    fontSize: '18px', 
    color: 'var(--text-heading-h2, var(--text-normal))',
    borderBottom: '1px solid var(--background-modifier-border)',
    paddingBottom: '0.2em',
    marginTop: '1.2em',
    marginBottom: '0.7em',
  },
  '.cm-header-3': { 
    fontSize: '1.5em', 
    color: 'var(--text-heading-h3, var(--text-normal))',
    marginTop: '1.1em',
    marginBottom: '0.6em',
  },
  '.cm-header-4': { 
    fontSize: '1.3em', 
    color: 'var(--text-heading-h4, var(--text-normal))',
    marginTop: '1em',
    marginBottom: '0.5em',
  },
  '.cm-header-5': { 
    fontSize: '1.15em', 
    color: 'var(--text-heading-h5, var(--text-muted))',
    marginTop: '0.9em',
    marginBottom: '0.4em',
  },
  '.cm-header-6': { 
    fontSize: '1em', 
    color: 'var(--text-heading-h6, var(--text-muted))',
    fontStyle: 'italic',
    marginTop: '0.8em',
    marginBottom: '0.3em',
  },
  
  // Header hash styling
  '.cm-formatting-header': {
    fontWeight: 'bold',
    lineHeight: '1.3',
    letterSpacing: '-0.01em',
    verticalAlign: 'baseline',
    marginRight: '0.2em',
  },
  
  '.cm-formatting-header-1': {
    fontSize: '20px',
    fontWeight: '800',
    color: 'var(--text-heading-h1, var(--interactive-accent, #5e81ac))',
    letterSpacing: '-0.02em',
  },
  
  '.cm-formatting-header-2': {
    fontSize: '18px',
    color: 'var(--text-heading-h2, var(--text-normal))',
  },
  
  '.cm-formatting-header-3': {
    fontSize: '1.5em',
    color: 'var(--text-heading-h3, var(--text-normal))',
  },
  
  '.cm-formatting-header-4': {
    fontSize: '1.3em',
    color: 'var(--text-heading-h4, var(--text-normal))',
  },
  
  '.cm-formatting-header-5': {
    fontSize: '1.15em',
    color: 'var(--text-heading-h5, var(--text-muted))',
  },
  
  '.cm-formatting-header-6': {
    fontSize: '1em',
    color: 'var(--text-heading-h6, var(--text-muted))',
    fontStyle: 'italic',
  },
  
  // Inline formatting
  '.cm-formatting-strong, .cm-formatting-em, .cm-formatting-strikethrough, .cm-formatting-code': {
    fontSize: '0.85em',
  },
  
  // Link and image formatting
  '.cm-formatting-link, .cm-formatting-image': {
    fontSize: '0.85em',
    color: 'var(--text-accent)',
  },
  
  // Blockquote formatting
  '.cm-formatting-quote': {
    color: 'var(--text-accent)',
    fontWeight: 'bold',
  },
  
  // Code blocks
  '.cm-line.cm-code-block-start': {
    fontFamily: 'var(--font-monospace)',
    backgroundColor: 'var(--code-background)',
    borderTopLeftRadius: '6px',
    borderTopRightRadius: '6px',
    padding: '8px 16px',
    marginTop: '16px',
  },
  
  '.cm-line.cm-code-block-content': {
    fontFamily: 'var(--font-monospace)',
    backgroundColor: 'var(--code-background)',
    padding: '0 16px',
    whiteSpace: 'pre-wrap',
  },
  
  '.cm-line.cm-code-block-end': {
    fontFamily: 'var(--font-monospace)',
    backgroundColor: 'var(--code-background)',
    borderBottomLeftRadius: '6px',
    borderBottomRightRadius: '6px',
    padding: '0 16px 8px',
    marginBottom: '16px',
  },
  
  // Code fence formatting
  '.cm-formatting-code-block': {
    fontFamily: 'var(--font-monospace)',
    color: 'var(--text-faint)',
  },
  
  // Language indicator
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
    zIndex: '10',
  },
  
  // Copy button
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
    zIndex: '10',
  },
  
  '.code-block-copy-button:hover': {
    opacity: '1',
    backgroundColor: 'var(--background-modifier-hover)',
  },
  
  '.code-block-copy-button.copied': {
    backgroundColor: 'var(--interactive-accent)',
    color: 'var(--text-on-accent)',
  },
  
  // Add animation for copy success
  '@keyframes copy-success': {
    '0%': { transform: 'scale(1)' },
    '50%': { transform: 'scale(1.2)' },
    '100%': { transform: 'scale(1)' },
  },
  
  '.code-block-copy-button.copied svg': {
    animation: 'copy-success 0.3s ease-in-out',
  },
  
  // Horizontal rule
  '.cm-formatting-hr': {
    color: 'var(--text-faint)',
  },
  
  // Dark theme adjustments
  '&.theme-dark .cm-line.cm-code-block-start, &.theme-dark .cm-line.cm-code-block-content, &.theme-dark .cm-line.cm-code-block-end': {
    backgroundColor: 'var(--code-background-enhanced-dark, rgba(255, 255, 255, 0.05))',
  },
  
  // Ensure proper line wrapping
  '.cm-content': {
    whiteSpace: 'pre-wrap',
    wordBreak: 'normal',
    overflowWrap: 'break-word',
    maxWidth: '100%',
  },
});

/**
 * Create the unified formatting extension
 */
export function createUnifiedFormattingExtension(): Extension[] {
  return [
    unifiedFormattingPlugin,
    unifiedFormattingTheme,
  ];
}