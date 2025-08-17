import { ViewPlugin, Decoration, DecorationSet, ViewUpdate } from "@codemirror/view";
    import { syntaxTree } from "@codemirror/language";
    import { RangeSetBuilder, EditorState } from "@codemirror/state";

    // Helper function to get the line number from a position
    function getLineNumber(pos: number, state: EditorState): number {
      return state.doc.lineAt(pos).number;
    }

    export function listNestingPlugin() {
      return ViewPlugin.fromClass(class {
        decorations: DecorationSet;

        constructor(view) {
          this.decorations = this.computeDecorations(view.state);
        }

        update(update: ViewUpdate) {
          // Recompute decorations if document, viewport, or (importantly) selection changes (for active line logic)
          // Also recompute if the theme changes, which might alter what's visible/hidden
          if (update.docChanged || update.viewportChanged || update.state.selectionSet || update.themeChanged) {
            this.decorations = this.computeDecorations(update.state);
          }
        }

        computeDecorations(state: EditorState): DecorationSet {
          const builder = new RangeSetBuilder<Decoration>();
          const lineDepthMap = new Map<number, number>(); 

          syntaxTree(state).iterate({
            enter: (node) => {
              // Check for list-related nodes. Specific names depend on the Markdown parser.
              // Common names: "ListItem", "BulletList", "OrderedList"
              // We want to find "ListItem" nodes and determine their depth
              // by counting ancestral "BulletList" or "OrderedList" nodes.

              if (node.name === "ListItem") {
                let currentDepth = 0; // Start at 0 for top-level items within a list
                  // Let's try a direct parent counting approach for depth for BulletList/OrderedList
                  // A ListItem is a child of a BulletList/OrderedList.
                  // The depth is how many BulletList/OrderedList are ancestors of that *parent* list.
                  if (node.node.parent?.name === "BulletList" || node.node.parent?.name === "OrderedList") {
                    let listContainerParent = node.node.parent.parent; // Start checking from grandparent of ListItem
                    while(listContainerParent) {
                        if (listContainerParent.name === "BulletList" || listContainerParent.name === "OrderedList") {
                            currentDepth++;
                        }
                        listContainerParent = listContainerParent.parent;
                    }
                  }
                  
                  const fromLineNo = getLineNumber(node.from, state);
                  const toLineNo = getLineNumber(node.to, state);

                  for (let l = fromLineNo; l <= toLineNo; l++) {
                    if (!lineDepthMap.has(l) || lineDepthMap.get(l)! < currentDepth) {
                      lineDepthMap.set(l, currentDepth);
                    }
                  }
              }
            }
          });

          for (const [lineNumber, depth] of lineDepthMap.entries()) {
            const line = state.doc.line(lineNumber);
            // Only add decoration if the line actually contains a list formatting mark.
            // This avoids adding depth classes to, for example, paragraphs inside a list item
            // if they are on separate lines.
            // We can check for the presence of "ListMark" within the line's syntax nodes.
            let hasListMark = false;
            syntaxTree(state).iterate({
                from: line.from,
                to: line.to,
                enter: (innerNode) => {
                    if (innerNode.name === "ListMark") {
                        hasListMark = true;
                        // Optional: could also check if it's a "formatting-list" if CM adds that specific class to ListMark
                        return false; // Stop iteration for this line once found
                    }
                }
            });

            if (hasListMark) {
                 builder.add(line.from, line.from, Decoration.line({
                    attributes: { class: `cm-list-depth-${depth}` }
                 }));
            }
          }
          
          return builder.finish();
        }
      }, {
        decorations: v => v.decorations
      });
    }
    