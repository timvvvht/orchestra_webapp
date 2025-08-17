/**
 * Header styling extension (compatibility layer)
 * 
 * This file re-exports functionality from the new modular formatting system
 * to maintain compatibility with existing code.
 */

import { Extension } from '@codemirror/state';
import { renderHeadings } from './formatting/renderers/render-headings';

/**
 * Creates an extension for styling headers in Markdown documents.
 * This is a compatibility wrapper around the new modular formatting system.
 */
export function createHeaderStylingExtension(): Extension[] {
  // Return empty array to disable this extension's current behavior
  // This effectively disables the problematic part of the header styling
  // pending a full review of how headers should be styled.
  return [];
}