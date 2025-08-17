// In /Users/tim/Code/orchestra/src/components/Editor/CleanCodeMirrorEditor/extensions/formatting/renderers/render-emphasis.ts
import { syntaxTree } from '@codemirror/language';
import { Extension, RangeSetBuilder, Range } from '@codemirror/state'; // Added Range for builder
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { rangeInSelection } from '../range-in-selection'; // Important for showing markers in selection

// This widget will be used to replace the emphasis markers (*, _, **, __)
// when they should be hidden (i.e., not in the active selection).
class EmphasisMarkerWidget extends WidgetType {
  // Optionally, pass marker text if needed for debugging or specific styling, though often not necessary
  // constructor(readonly markerText: string) { super(); }

  toDOM() {
    const span = document.createElement('span');
    // This class is crucial for CSS in formatting/index.ts or formatting.css
    // to hide/show based on active line (for emphasis, not headers)
    span.className = 'cm-formatting cm-formatting-emphasis';
    // span.textContent = this.markerText; // Usually not needed if just hiding
    return span;
  }

  eq(other: EmphasisMarkerWidget): boolean {
    // return other.markerText === this.markerText; // if markerText is used
    return true; // Simple equality if no internal state varies
  }

  ignoreEvent(): boolean {
    return true;
  }

  // Essential: even if empty, a destroy method prevents the "this.widget.destroy is not a function" error.
  destroy() {
    // Perform any cleanup if this widget held onto resources,
    // e.g., event listeners on its DOM. For simple spans, often not needed.
  }
}

const emphasisRendererPlugin = ViewPlugin.fromClass(class {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = this.buildDecorations(view);
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged || update.selectionSet) {
      this.decorations = this.buildDecorations(update.view);
    }
  }

  buildDecorations(view: EditorView): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>();

    for (const { from, to } of view.visibleRanges) {
      syntaxTree(view.state).iterate({
        from,
        to,
        enter: (node) => {
          // Looking for 'EmphasisMark', 'StrongEmphasisMark' (Lezer specific names)
          // These are typically children of 'Emphasis' or 'StrongEmphasis' nodes.
          // Or, target 'Emphasis', 'StrongEmphasis' nodes and then find their marker children.
          // Let's assume 'EmphasisMark' is a direct node for '*' or '_'.
          // And 'StrongEmphasisMark' for '**' or '__'.
          // (The exact node names should be verified from Lezer Markdown grammar if issues arise)

          if (node.name === 'EmphasisMark' || node.name === 'StrongEmphasisMark') {
            // IMPORTANT: Do not hide markers if the cursor/selection is within or touching the parent emphasis node.
            // The `rangeInSelection` utility helps here.
            // `node.parent` would be the 'Emphasis' or 'StrongEmphasis' node.
            const parentNode = node.node.parent; // Get the actual parent SyntaxNode
            if (parentNode && rangeInSelection(view.state, parentNode.from, parentNode.to)) {
              // Selection is inside or touching the emphasis, so markers should be visible (no decoration to hide them)
              return;
            }

            // If not in selection, create a decoration to hide/replace the marker.
            builder.add(
              node.from,
              node.to,
              Decoration.replace({
                widget: new EmphasisMarkerWidget(/* view.state.doc.sliceString(node.from, node.to) */), // Pass marker text if widget needs it
                // Alternatively, if EmphasisMarkerWidget is not needed and CSS can handle it:
                // attributes: { class: 'cm-formatting cm-formatting-emphasis' }
              })
            );
          }
        },
      });
    }
    return builder.finish();
  }
}, {
  decorations: v => v.decorations,
});

export const renderEmphasis: Extension = [
  emphasisRendererPlugin,
  // Potentially, an EditorView.baseTheme({}) here if this component needs
  // very specific CSS rules not covered by the global formatting/index.ts theme.
  // Generally, for inline elements, the global theme in formatting/index.ts is sufficient.
];
