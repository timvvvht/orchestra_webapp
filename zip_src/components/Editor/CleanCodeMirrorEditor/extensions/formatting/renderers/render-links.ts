// In /Users/tim/Code/orchestra/src/components/Editor/CleanCodeMirrorEditor/extensions/formatting/renderers/render-links.ts
import { syntaxTree } from '@codemirror/language';
import { Extension, RangeSetBuilder } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { rangeInSelection } from '../range-in-selection';

class LinkMarkerWidget extends WidgetType {
  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-formatting cm-formatting-link';
    return span;
  }
  eq(other: LinkMarkerWidget): boolean { return true; }
  ignoreEvent(): boolean { return true; }
  destroy() {}
}

const linkRendererPlugin = ViewPlugin.fromClass(class {
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
          // Parent nodes are Link or Image
          if (node.name === 'Link' || node.name === 'Image') {
            // Check selection on the parent Link/Image node
            if (rangeInSelection(view.state, node.from, node.to)) return;

            // Iterate over children to find LinkMark or ImageMark
            let child = node.node.firstChild;
            while(child) {
              if (child.name === 'LinkMark' || child.name === 'ImageMark') {
                // LinkMark includes [, ], (, ), <, >
                // ImageMark includes ![, ], (, ), <, >
                builder.add(
                  child.from,
                  child.to,
                  Decoration.replace({ widget: new LinkMarkerWidget() })
                );
              }
              child = child.nextSibling;
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

export const renderLinks: Extension = [
  linkRendererPlugin,
];
