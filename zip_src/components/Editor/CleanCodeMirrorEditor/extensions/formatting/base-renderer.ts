/**
 * Base utilities for creating renderers.
 */
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  DecorationSet,
  ViewUpdate
} from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { SyntaxNodeRef } from '@lezer/common';
import { StateField, EditorState } from '@codemirror/state';
import { rangeInSelection } from './range-in-selection';

/**
 * Renders widgets for the provided visible ranges based on syntax nodes.
 */
function renderWidgets(
  state: EditorState,
  visibleRanges: ReadonlyArray<{ from: number, to: number }>,
  shouldHandleNode: (node: SyntaxNodeRef) => boolean,
  createWidget: (state: EditorState, node: SyntaxNodeRef) => WidgetType | undefined
): DecorationSet {
  const widgets: any[] = [];

  if (visibleRanges.length === 0) {
    // Process the whole document
    visibleRanges = [{ from: 0, to: state.doc.length }];
  }

  for (const { from, to } of visibleRanges) {
    syntaxTree(state).iterate({
      from,
      to,
      enter: (node) => {
        // Don't render if node is in selection
        if (rangeInSelection(state, node.from, node.to)) {
          return;
        }

        // Check if this node should be handled
        if (!shouldHandleNode(node)) {
          return;
        }

        // Create and add the widget
        const renderedWidget = createWidget(state, node);
        if (renderedWidget === undefined) {
          return;
        }
        
        // Ensure the widget has a destroy method
        if (typeof renderedWidget.destroy !== 'function') {
          console.warn('Widget missing destroy method, adding default implementation');
          renderedWidget.destroy = () => {};
        }
        
        const widget = Decoration.replace({
          widget: renderedWidget,
          inclusive: false
        });

        widgets.push(widget.range(node.from, node.to));
      }
    });
  }

  return Decoration.set(widgets);
}

/**
 * Creates a ViewPlugin for rendering inline widgets.
 */
export function renderInlineWidgets(
  shouldHandleNode: (node: SyntaxNodeRef) => boolean,
  createWidget: (state: EditorState, node: SyntaxNodeRef) => WidgetType | undefined
): ViewPlugin<any> {
  return ViewPlugin.fromClass(class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = renderWidgets(view.state, view.visibleRanges, shouldHandleNode, createWidget);
    }

    update(update: ViewUpdate): void {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = renderWidgets(update.view.state, update.view.visibleRanges, shouldHandleNode, createWidget);
      }
    }
  }, {
    decorations: view => view.decorations
  });
}

/**
 * Creates a StateField for rendering block widgets.
 */
export function renderBlockWidgets(
  shouldHandleNode: (node: SyntaxNodeRef) => boolean,
  createWidget: (state: EditorState, node: SyntaxNodeRef) => WidgetType | undefined
): StateField<DecorationSet> {
  return StateField.define<DecorationSet>({
    create(state: EditorState) {
      return renderWidgets(state, [], shouldHandleNode, createWidget);
    },
    update(oldDecoSet, transactions) {
      return renderWidgets(transactions.state, [], shouldHandleNode, createWidget);
    },
    provide: f => EditorView.decorations.from(f)
  });
}