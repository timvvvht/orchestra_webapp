import { EditorView, ViewPlugin, ViewUpdate, Decoration, DecorationSet } from '@codemirror/view';
import { RangeSetBuilder, Extension } from '@codemirror/state';

// Interface for header information
interface HeaderInfo {
  level: number;
  text: string;
  line: number;
  from: number;
  to: number;
}

// Regular expression to match header lines (# to ######)
const headerRegex = /^(#{1,6})\s+(.*)$/;

/**
 * Plugin that tracks headers in the document and can generate a table of contents
 */
export const tableOfContentsPlugin = ViewPlugin.fromClass(
  class {
    headers: HeaderInfo[] = [];
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.headers = this.scanHeaders(view);
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged) {
        this.headers = this.scanHeaders(update.view);
        this.decorations = this.buildDecorations(update.view);
      }
    }

    // Scan the document for headers
    scanHeaders(view: EditorView): HeaderInfo[] {
      const headers: HeaderInfo[] = [];
      const { state } = view;
      const { doc } = state;

      for (let i = 1; i <= doc.lines; i++) {
        const line = doc.line(i);
        const lineText = line.text;
        const match = lineText.match(headerRegex);

        if (match) {
          const level = match[1].length;
          const text = match[2].trim();
          headers.push({
            level,
            text,
            line: i,
            from: line.from,
            to: line.to
          });
        }
      }

      return headers;
    }

    // Build decorations for the table of contents
    buildDecorations(view: EditorView): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>();
      // We could add decorations here if needed
      return builder.finish();
    }

    // Generate a markdown table of contents
    generateTOC(): string {
      if (this.headers.length === 0) {
        return "No headers found in the document.";
      }

      let toc = "# Table of Contents\n\n";
      
      this.headers.forEach(header => {
        // Indent based on header level
        const indent = '  '.repeat(header.level - 1);
        // Create a link-friendly version of the header text
        const linkText = header.text
          .toLowerCase()
          .replace(/[^\w\s-]/g, '') // Remove special chars
          .replace(/\s+/g, '-'); // Replace spaces with hyphens
        
        toc += `${indent}- [${header.text}](#${linkText})\n`;
      });

      return toc;
    }
  }
);

/**
 * Command to insert a table of contents at the current cursor position
 */
export function insertTableOfContents(view: EditorView): boolean {
  const plugin = view.plugin(tableOfContentsPlugin);
  if (!plugin) return false;

  const toc = plugin.generateTOC();
  const { state, dispatch } = view;
  const { selection } = state;
  
  dispatch(state.update({
    changes: { from: selection.main.from, to: selection.main.from, insert: toc }
  }));
  
  return true;
}

/**
 * Create the table of contents extension
 */
export function createTableOfContentsExtension(): Extension[] {
  return [
    tableOfContentsPlugin
  ];
}