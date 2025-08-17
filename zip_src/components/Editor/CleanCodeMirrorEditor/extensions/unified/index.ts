/**
 * Unified Formatting System for CodeMirror 6
 * 
 * This file exports all the unified formatting extensions.
 */

import { Extension } from '@codemirror/state';
import { createUnifiedFormattingExtension } from './unified-formatting';
import { createCodeBlockStylingExtension } from './code-block-styling';

/**
 * Create all unified formatting extensions
 */
export function createUnifiedFormattingSystem(): Extension[] {
  return [
    // Core unified formatting system
    ...createUnifiedFormattingExtension(),
    
    // Code block styling
    ...createCodeBlockStylingExtension(),
  ];
}

// Re-export for direct access
export * from './unified-formatting';
export * from './code-block-styling';