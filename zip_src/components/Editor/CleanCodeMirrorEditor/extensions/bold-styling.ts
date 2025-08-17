import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

// Regular expression to match bold text (** or __)
const boldRegex = /\*\*(.*?)\*\*|__(.*?)__/g;

// Create decorations for bold asterisks
const boldAsteriskDecoration = Decoration.mark({
  class: 'cm-bold-asterisk',
  attributes: { 'data-bold-asterisk': 'true' }
});

// Create a view plugin that adds decorations to bold asterisks
export const boldStylingPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    buildDecorations(view: EditorView) {
      const builder = new RangeSetBuilder<Decoration>();
      const activeLine = view.state.selection.main.head;
      const activeLineInfo = view.state.doc.lineAt(activeLine);

      // Collect all decorations first, then sort and add them
      const allDecorations: {from: number, to: number, decoration: Decoration}[] = [];

      // Process visible lines
      for (let { from, to } of view.visibleRanges) {
        let pos = from;
        while (pos <= to) {
          const line = view.state.doc.lineAt(pos);
          const lineText = line.text;
          
          // Skip processing if this is the active line
          if (line.number === activeLineInfo.number) {
            pos = line.to + 1;
            continue;
          }
          
          // Find all bold text in this line
          let match;
          boldRegex.lastIndex = 0; // Reset regex
          
          while ((match = boldRegex.exec(lineText)) !== null) {
            // Collect decoration for opening asterisks
            allDecorations.push({
              from: line.from + match.index,
              to: line.from + match.index + 2, // ** or __ is 2 chars
              decoration: boldAsteriskDecoration
            });
            
            // Collect decoration for closing asterisks
            allDecorations.push({
              from: line.from + match.index + match[0].length - 2,
              to: line.from + match.index + match[0].length,
              decoration: boldAsteriskDecoration
            });
          }
          
          // Also check for standalone ** that might not be part of a complete bold pattern
          const asteriskRegex = /\*\*/g;
          asteriskRegex.lastIndex = 0;
          
          while ((match = asteriskRegex.exec(lineText)) !== null) {
            // Check if this is already part of a complete bold pattern
            let isPartOfBold = false;
            boldRegex.lastIndex = 0;
            let boldMatch;
            
            while ((boldMatch = boldRegex.exec(lineText)) !== null) {
              const openingStart = boldMatch.index;
              const openingEnd = openingStart + 2;
              const closingStart = openingStart + boldMatch[0].length - 2;
              const closingEnd = openingStart + boldMatch[0].length;
              
              if (
                (match.index >= openingStart && match.index < openingEnd) ||
                (match.index >= closingStart && match.index < closingEnd)
              ) {
                isPartOfBold = true;
                break;
              }
            }
            
            // If not part of a complete bold pattern, collect decoration
            if (!isPartOfBold) {
              allDecorations.push({
                from: line.from + match.index,
                to: line.from + match.index + 2,
                decoration: boldAsteriskDecoration
              });
            }
          }
          
          pos = line.to + 1;
        }
      }

      // Sort decorations by from position
      allDecorations.sort((a, b) => {
        // First sort by from position
        const fromDiff = a.from - b.from;
        if (fromDiff !== 0) return fromDiff;
        
        // If from positions are equal, line decorations should come before mark decorations
        const aIsLine = a.decoration.spec.type === "line";
        const bIsLine = b.decoration.spec.type === "line";
        if (aIsLine !== bIsLine) return aIsLine ? -1 : 1;
        
        // If both are the same type, sort by to position
        return a.to - b.to;
      });

      // Add decorations in sorted order
      for (const { from, to, decoration } of allDecorations) {
        builder.add(from, to, decoration);
      }

      return builder.finish();
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

// CSS styles for bold asterisk decorations
export const boldStylingStyles = EditorView.baseTheme({
  // Hide bold asterisks by default
  '.cm-bold-asterisk': {
    display: 'none !important',
  },
  // Show on active line
  '.cm-line.cm-activeLine .cm-bold-asterisk': {
    display: 'inline !important',
    color: 'var(--text-muted, rgba(55, 53, 47, 0.5)) !important',
  }
});

// Create a comprehensive bold styling extension
export function createBoldStylingExtension() {
  return [
    boldStylingPlugin,
    boldStylingStyles,
  ];
}