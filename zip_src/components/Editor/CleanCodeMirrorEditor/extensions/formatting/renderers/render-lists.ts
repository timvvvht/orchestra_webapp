// In /Users/tim/Code/orchestra/src/components/Editor/CleanCodeMirrorEditor/extensions/formatting/renderers/render-lists.ts
import { syntaxTree } from '@codemirror/language';
import { Extension, RangeSetBuilder } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { rangeInSelection } from '../range-in-selection';

class ListMarkerWidget extends WidgetType {
  toDOM() {
    const span = document.createElement('span');
    // Use a different class that won't be hidden by default
    span.className = 'cm-formatting-list-always-visible';
    return span;
  }
  eq(other: ListMarkerWidget): boolean { return true; }
  ignoreEvent(): boolean { return true; }
  destroy() {}
}

const listRendererPlugin = ViewPlugin.fromClass(class {
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
          // Parent node is ListItem
          if (node.name === 'ListItem') {
            // If selection is within the ListItem, CSS will handle showing markers on active line.
            // If not in selection (e.g. cursor is elsewhere, or line is not active), markers will be hidden by default CSS.
            // So, we always apply the widget to ListMark and let CSS manage visibility.
            // However, if rangeInSelection is true for the ListItem, we might choose *not* to add the widget
            // if we wanted markers *always* visible when the line is selected, overriding the default CSS behavior.
            // For now, let's assume CSS activeLine behavior is sufficient.
            // The `rangeInSelection` check on `ListItem` could be used if we need more nuanced control.
            // Example: if (rangeInSelection(view.state, node.from, node.to)) { /* special handling for selected list items */ }

            let child = node.node.firstChild; // ListMark is usually the first child
            if (child && child.name === 'ListMark') {
              // Check if the selection is within the ListMark itself to prevent hiding if user is editing it.
              // Or, rely on the formatting/index.ts CSS: .cm-line.cm-activeLine .cm-formatting:not(.cm-formatting-header)
              // which should make the cm-formatting-list span visible on active lines.
              if (rangeInSelection(view.state, child.from, child.to)) {
                // If selection is directly on the mark, don't hide it.
                return;
              }
              // Don't replace list markers - they should always be visible
              // Just mark them with a class for styling
              builder.add(
                child.from,
                child.to,
                Decoration.mark({ class: 'cm-formatting-list' })
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

export const renderLists: Extension = [
  listRendererPlugin,
];
