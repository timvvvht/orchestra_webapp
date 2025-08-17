import { syntaxTree } from '@codemirror/language';
import { Extension, Range, RangeSetBuilder } from '@codemirror/state'; // Added RangeSetBuilder
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';

// This ViewPlugin will be responsible for adding line classes like cm-header-1, cm-header-2, etc.
// These classes will be used by the theme (Tokyo Night) and formatting.css to set font sizes.
const headerLineClasses = ViewPlugin.fromClass(class {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = this.getLineDecorations(view);
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged || update.selectionSet) {
      this.decorations = this.getLineDecorations(update.view);
    }
  }

  getLineDecorations(view: EditorView): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>();
    for (const { from, to } of view.visibleRanges) {
      syntaxTree(view.state).iterate({
        from,
        to,
        enter: (node) => {
          // Check for heading nodes (e.g., ATXHeading1, ATXHeading2, etc.)
          // The Lezer grammar for @codemirror/lang-markdown uses node names like
          // "ATXHeading1", "ATXHeading2", ..., "ATXHeading6" for the entire header line (including markers and text).
          // It also has "HeaderMark" for just the '#' sequence.
          if (node.name.startsWith('ATXHeading')) {
            const level = parseInt(node.name.substring('ATXHeading'.length), 10);
            if (level >= 1 && level <= 6) {
              builder.add(
                node.from, // Decorate the entire line
                node.from, // Point decoration, applied to the line
                Decoration.line({
                  attributes: { class: `cm-header cm-header-${level}` },
                })
              );
            }
          }
        },
      });
    }
    return builder.finish();
  }
}, {
  decorations: v => v.decorations,
});

// This ViewPlugin will hide the header markers (e.g., '#', '##')
// It replaces the HeaderMark nodes with an empty span that has CSS to hide it,
// or simply a zero-length decoration.
const hideHeaderMarkers = ViewPlugin.fromClass(class {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = this.getMarkerDecorations(view);
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged || update.selectionSet /* for selection-aware hiding, if needed later */) {
      this.decorations = this.getMarkerDecorations(update.view);
    }
  }

  getMarkerDecorations(view: EditorView): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>();
    const activeLineNumber = view.state.doc.lineAt(view.state.selection.main.head).number;

    for (const { from, to } of view.visibleRanges) {
      syntaxTree(view.state).iterate({
        from,
        to,
        enter: (node) => {
          if (node.name === 'HeaderMark') {
            const lineNumber = view.state.doc.lineAt(node.from).number;
            
            // Only hide header marks on non-active lines (Obsidian-like behavior)
            if (lineNumber !== activeLineNumber) {
              // Use Decoration.replace to completely remove the header marks and their space
              // Check if there's a space after the header marks
              const endPos = node.to;
              const nextChar = view.state.doc.sliceString(endPos, endPos + 1);
              const includeSpace = nextChar === ' ';
              
              builder.add(
                node.from, 
                includeSpace ? endPos + 1 : endPos, 
                Decoration.replace({})
              );
            } else {
              // On active line, add a mark decoration to style the header marks
              builder.add(node.from, node.to, Decoration.mark({
                class: 'cm-header-mark-visible'
              }));
            }
          }
        },
      });
    }
    return builder.finish();
  }
}, {
  decorations: v => v.decorations,
});


// The renderHeadings extension combines both plugins.
export const renderHeadings: Extension = [
  headerLineClasses,
  hideHeaderMarkers,
  // Ensure the base theme for .cm-formatting-header (display: none !important) is active
  // This is usually handled in formatting/index.ts, but good to be mindful of.
];
