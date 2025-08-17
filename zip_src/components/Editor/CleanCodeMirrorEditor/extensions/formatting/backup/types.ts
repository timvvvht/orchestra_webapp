/**
 * Types for the unified formatting system
 */

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
  HIGHLIGHT_MARKER,     // == markers
  
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
export interface CodeBlock {
  startLine: number;
  endLine: number;
  startPos: number;
  endPos: number;
  language: string;
  content: string;
}