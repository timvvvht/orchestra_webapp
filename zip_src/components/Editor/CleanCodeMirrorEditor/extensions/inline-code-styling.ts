/**
 * Inline Code Styling Extension for CodeMirror 6
 * 
 * This extension provides enhanced styling for inline code blocks in Markdown,
 * ensuring the background color is applied to the entire code span, not just the backticks.
 */

import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

// Regular expression to match inline code: `code`
const INLINE_CODE_REGEX = /`([^`]+)`/g;

// Create a decoration for inline code content
const inlineCodeDecoration = Decoration.mark({
  class: 'cm-inline-code',
  attributes: { 'data-type': 'inline-code' }
});

/**
 * ViewPlugin that adds decorations to inline code spans
 */
export const inlineCodeStylingPlugin = ViewPlugin.fromClass(
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

    buildDecorations(view: EditorView) {
      const builder = new RangeSetBuilder<Decoration>();

      // Process visible lines
      for (let { from, to } of view.visibleRanges) {
        let pos = from;
        while (pos <= to) {
          const line = view.state.doc.lineAt(pos);
          const lineText = line.text;
          
          // Find all inline code spans in this line
          INLINE_CODE_REGEX.lastIndex = 0; // Reset regex
          let match;
          while ((match = INLINE_CODE_REGEX.exec(lineText)) !== null) {
            const fullMatch = match[0];
            const codeContent = match[1];
            const startPos = line.from + match.index + 1; // After opening backtick
            const endPos = line.from + match.index + fullMatch.length - 1; // Before closing backtick
            
            // Add decoration for the content between backticks
            if (startPos < endPos) {
              builder.add(startPos, endPos, inlineCodeDecoration);
            }
          }
          
          pos = line.to + 1;
        }
      }

      return builder.finish();
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

/**
 * CSS styles for inline code
 */
export const inlineCodeStyles = EditorView.baseTheme({
  // Inline code styling
  '.cm-inline-code': {
    fontFamily: 'var(--font-monospace, monospace)',
    fontSize: '0.9em',
    backgroundColor: 'var(--code-background, rgba(0, 0, 0, 0.12))',
    padding: '0.1em 0.2em',
    borderRadius: '3px',
    color: 'var(--code-normal, var(--text-normal))',
  },
});

/**
 * Create the inline code styling extension
 */
export function createInlineCodeStylingExtension() {
  return [
    inlineCodeStylingPlugin,
    inlineCodeStyles,
  ];
}