// In /Users/tim/Code/orchestra/src/components/Editor/CleanCodeMirrorEditor/extensions/formatting/renderers/render-code.ts
import { syntaxTree } from '@codemirror/language';
import { Extension, RangeSetBuilder } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { rangeInSelection } from '../range-in-selection';

class CodeMarkerWidget extends WidgetType {
  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-formatting cm-formatting-code';
    return span;
  }
  eq(other: CodeMarkerWidget): boolean { return true; }
  ignoreEvent(): boolean { return true; }
  destroy() {}
}

const codeRendererPlugin = ViewPlugin.fromClass(class {
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
          if (node.name === 'InlineCode') {
            if (rangeInSelection(view.state, node.from, node.to)) return;

            // Iterate over children to find CodeMark
            let child = node.node.firstChild;
            while(child) {
              if (child.name === 'CodeMark') {
                builder.add(
                  child.from,
                  child.to,
                  Decoration.replace({ widget: new CodeMarkerWidget() })
                );
              }
              child = child.nextSibling;
            }
          } else if (node.name === 'FencedCode') {
            // For FencedCode, we want to hide the CodeFence (```) and CodeInfo (language string) parts
            // if the selection is not within the entire FencedCode block.
            if (rangeInSelection(view.state, node.from, node.to)) return;

            let child = node.node.firstChild;
            while(child) {
              if (child.name === 'CodeFence' || child.name === 'CodeInfo') {
                 // CodeInfo might not exist (e.g. ``` some code ``` vs ```js some code ```)
                 // And there are two CodeFence nodes (opening and closing)
                builder.add(
                  child.from,
                  child.to,
                  Decoration.replace({ widget: new CodeMarkerWidget() })
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

export const renderCode: Extension = [
  codeRendererPlugin,
];
