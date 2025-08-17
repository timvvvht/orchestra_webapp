/**
 * BasicFormattingExtension for handling basic text formatting
 * 
 * This extension handles basic text formatting like bold, italic, strikethrough, etc.
 */

import { Decoration, EditorView } from '@codemirror/view';
import { BaseDecorationExtension } from '../../core/BaseDecorationExtension';
import { ExtensionPriority } from '../../core/types';
import { SortableDecoration } from '../../core/DecorationManager';
import { isOnActiveLine } from '../../core/utils';

/**
 * Types of basic formatting
 */
enum FormattingType {
  Bold,
  Italic,
  Strikethrough,
  InlineCode,
  Highlight
}

/**
 * Extension for basic text formatting
 */
export class BasicFormattingExtension extends BaseDecorationExtension {
  /**
   * Create a new BasicFormattingExtension
   */
  constructor() {
    super({
      id: 'basic-formatting',
      name: 'Basic Text Formatting',
      priority: ExtensionPriority.Normal,
      enabled: true
    });
  }
  
  /**
   * Create decorations for basic text formatting
   * @param view The CodeMirror editor view
   * @returns An array of sortable decorations
   */
  createDecorations(view: EditorView): SortableDecoration[] {
    const { state } = view;
    const { doc } = state;
    const decorations: SortableDecoration[] = [];
    
    // Process each visible range
    for (const { from, to } of view.visibleRanges) {
      let pos = from;
      
      while (pos <= to) {
        // Get the line at the current position
        const line = doc.lineAt(pos);
        const lineText = line.text;
        const isActive = isOnActiveLine(view, line.from);
        
        // Detect bold formatting: ** or __
        this.detectBoldFormatting(lineText, line.from, decorations, isActive);
        
        // Detect italic formatting: * or _
        this.detectItalicFormatting(lineText, line.from, decorations, isActive);
        
        // Detect strikethrough formatting: ~~
        this.detectStrikethroughFormatting(lineText, line.from, decorations, isActive);
        
        // Detect inline code formatting: `
        this.detectInlineCodeFormatting(lineText, line.from, decorations, isActive);
        
        // Detect highlight formatting: ==
        this.detectHighlightFormatting(lineText, line.from, decorations, isActive);
        
        // Move to the next line
        pos = line.to + 1;
      }
    }
    
    return decorations;
  }
  
  /**
   * Detect bold formatting in a line
   */
  private detectBoldFormatting(lineText: string, lineStart: number, decorations: SortableDecoration[], isActive: boolean): void {
    // Match bold formatting: ** or __
    const boldRegex = /\*\*(.*?)\*\*|__(.*?)__/g;
    let match;
    
    while ((match = boldRegex.exec(lineText)) !== null) {
      const fullMatch = match[0];
      const content = match[1] || match[2];
      const isStar = fullMatch.startsWith('**');
      
      // Add decoration for the opening marker
      decorations.push({
        from: lineStart + match.index,
        to: lineStart + match.index + 2, // ** or __ is 2 chars
        decoration: Decoration.mark({
          class: 'cm-formatting cm-formatting-strong',
          attributes: { 'data-formatting-type': 'bold' }
        }),
        priority: 10,
        source: this.config.id
      });
      
      // Add decoration for the content
      decorations.push({
        from: lineStart + match.index + 2,
        to: lineStart + match.index + fullMatch.length - 2,
        decoration: Decoration.mark({
          class: 'cm-strong',
          attributes: { 'data-formatting-type': 'bold-content' }
        }),
        priority: 10,
        source: this.config.id
      });
      
      // Add decoration for the closing marker
      decorations.push({
        from: lineStart + match.index + fullMatch.length - 2,
        to: lineStart + match.index + fullMatch.length,
        decoration: Decoration.mark({
          class: 'cm-formatting cm-formatting-strong',
          attributes: { 'data-formatting-type': 'bold' }
        }),
        priority: 10,
        source: this.config.id
      });
    }
  }
  
  /**
   * Detect italic formatting in a line
   */
  private detectItalicFormatting(lineText: string, lineStart: number, decorations: SortableDecoration[], isActive: boolean): void {
    // Match italic formatting: * or _
    // Avoid matching ** or __ which are for bold
    const italicRegex = /(?<!\*)\*(?!\*)(.*?)\*(?!\*)|(?<!_)_(?!_)(.*?)_(?!_)/g;
    let match;
    
    while ((match = italicRegex.exec(lineText)) !== null) {
      const fullMatch = match[0];
      const content = match[1] || match[2];
      const isStar = fullMatch.startsWith('*');
      
      // Add decoration for the opening marker
      decorations.push({
        from: lineStart + match.index,
        to: lineStart + match.index + 1, // * or _ is 1 char
        decoration: Decoration.mark({
          class: 'cm-formatting cm-formatting-em',
          attributes: { 'data-formatting-type': 'italic' }
        }),
        priority: 10,
        source: this.config.id
      });
      
      // Add decoration for the content
      decorations.push({
        from: lineStart + match.index + 1,
        to: lineStart + match.index + fullMatch.length - 1,
        decoration: Decoration.mark({
          class: 'cm-em',
          attributes: { 'data-formatting-type': 'italic-content' }
        }),
        priority: 10,
        source: this.config.id
      });
      
      // Add decoration for the closing marker
      decorations.push({
        from: lineStart + match.index + fullMatch.length - 1,
        to: lineStart + match.index + fullMatch.length,
        decoration: Decoration.mark({
          class: 'cm-formatting cm-formatting-em',
          attributes: { 'data-formatting-type': 'italic' }
        }),
        priority: 10,
        source: this.config.id
      });
    }
  }
  
  /**
   * Detect strikethrough formatting in a line
   */
  private detectStrikethroughFormatting(lineText: string, lineStart: number, decorations: SortableDecoration[], isActive: boolean): void {
    // Match strikethrough formatting: ~~
    const strikethroughRegex = /~~(.*?)~~/g;
    let match;
    
    while ((match = strikethroughRegex.exec(lineText)) !== null) {
      const fullMatch = match[0];
      const content = match[1];
      
      // Add decoration for the opening marker
      decorations.push({
        from: lineStart + match.index,
        to: lineStart + match.index + 2, // ~~ is 2 chars
        decoration: Decoration.mark({
          class: 'cm-formatting cm-formatting-strikethrough',
          attributes: { 'data-formatting-type': 'strikethrough' }
        }),
        priority: 10,
        source: this.config.id
      });
      
      // Add decoration for the content
      decorations.push({
        from: lineStart + match.index + 2,
        to: lineStart + match.index + fullMatch.length - 2,
        decoration: Decoration.mark({
          class: 'cm-strikethrough',
          attributes: { 'data-formatting-type': 'strikethrough-content' }
        }),
        priority: 10,
        source: this.config.id
      });
      
      // Add decoration for the closing marker
      decorations.push({
        from: lineStart + match.index + fullMatch.length - 2,
        to: lineStart + match.index + fullMatch.length,
        decoration: Decoration.mark({
          class: 'cm-formatting cm-formatting-strikethrough',
          attributes: { 'data-formatting-type': 'strikethrough' }
        }),
        priority: 10,
        source: this.config.id
      });
    }
  }
  
  /**
   * Detect inline code formatting in a line
   */
  private detectInlineCodeFormatting(lineText: string, lineStart: number, decorations: SortableDecoration[], isActive: boolean): void {
    // Match inline code formatting: `
    const inlineCodeRegex = /`([^`]+)`/g;
    let match;
    
    while ((match = inlineCodeRegex.exec(lineText)) !== null) {
      const fullMatch = match[0];
      const content = match[1];
      
      // Add decoration for the opening marker
      decorations.push({
        from: lineStart + match.index,
        to: lineStart + match.index + 1, // ` is 1 char
        decoration: Decoration.mark({
          class: 'cm-formatting cm-formatting-code',
          attributes: { 'data-formatting-type': 'inline-code' }
        }),
        priority: 10,
        source: this.config.id
      });
      
      // Add decoration for the content
      decorations.push({
        from: lineStart + match.index + 1,
        to: lineStart + match.index + fullMatch.length - 1,
        decoration: Decoration.mark({
          class: 'cm-inline-code',
          attributes: { 'data-formatting-type': 'inline-code-content' }
        }),
        priority: 10,
        source: this.config.id
      });
      
      // Add decoration for the closing marker
      decorations.push({
        from: lineStart + match.index + fullMatch.length - 1,
        to: lineStart + match.index + fullMatch.length,
        decoration: Decoration.mark({
          class: 'cm-formatting cm-formatting-code',
          attributes: { 'data-formatting-type': 'inline-code' }
        }),
        priority: 10,
        source: this.config.id
      });
    }
  }
  
  /**
   * Detect highlight formatting in a line
   */
  private detectHighlightFormatting(lineText: string, lineStart: number, decorations: SortableDecoration[], isActive: boolean): void {
    // Match highlight formatting: ==
    const highlightRegex = /==(.*?)==/g;
    let match;
    
    while ((match = highlightRegex.exec(lineText)) !== null) {
      const fullMatch = match[0];
      const content = match[1];
      
      // Add decoration for the opening marker
      decorations.push({
        from: lineStart + match.index,
        to: lineStart + match.index + 2, // == is 2 chars
        decoration: Decoration.mark({
          class: 'cm-formatting cm-formatting-highlight',
          attributes: { 'data-formatting-type': 'highlight' }
        }),
        priority: 10,
        source: this.config.id
      });
      
      // Add decoration for the content
      decorations.push({
        from: lineStart + match.index + 2,
        to: lineStart + match.index + fullMatch.length - 2,
        decoration: Decoration.mark({
          class: 'cm-highlight',
          attributes: { 'data-formatting-type': 'highlight-content' }
        }),
        priority: 10,
        source: this.config.id
      });
      
      // Add decoration for the closing marker
      decorations.push({
        from: lineStart + match.index + fullMatch.length - 2,
        to: lineStart + match.index + fullMatch.length,
        decoration: Decoration.mark({
          class: 'cm-formatting cm-formatting-highlight',
          attributes: { 'data-formatting-type': 'highlight' }
        }),
        priority: 10,
        source: this.config.id
      });
    }
  }
  
  /**
   * Create the CodeMirror extensions for this extension
   * @returns An array of CodeMirror extensions
   */
  createExtensions() {
    return [
      // Add the view plugin for decorations
      this.createViewPlugin(),
      
      // Add the theme for styling the formatting
      EditorView.baseTheme({
        // Base formatting - hidden by default
        '.cm-formatting': {
          display: 'none',
          color: 'var(--text-faint)',
          opacity: 0.7,
        },
        
        // Show on active line
        '.cm-line.cm-activeLine .cm-formatting': {
          display: 'inline',
        },
        
        // Bold styling
        '.cm-strong': {
          fontWeight: 'bold',
        },
        
        // Italic styling
        '.cm-em': {
          fontStyle: 'italic',
        },
        
        // Strikethrough styling
        '.cm-strikethrough': {
          textDecoration: 'line-through',
        },
        
        // Inline code styling
        '.cm-inline-code': {
          fontFamily: 'var(--font-monospace)',
          backgroundColor: 'var(--code-background)',
          padding: '0.1em 0.2em',
          borderRadius: '0.2em',
          fontSize: '0.9em',
        },
        
        // Highlight styling
        '.cm-highlight': {
          backgroundColor: 'var(--text-highlight-bg)',
          color: 'var(--text-normal)',
        },
      })
    ];
  }
}