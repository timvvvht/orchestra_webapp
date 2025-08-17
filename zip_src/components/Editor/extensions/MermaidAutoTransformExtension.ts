import { Extension } from "@tiptap/core";
// eslint-disable-next-line import/namespace
import { Plugin } from "prosemirror-state";

export const MermaidAutoTransformExtension = Extension.create({
  name: "mermaidAutoTransform",

  onCreate() {
    const { state, view } = this.editor;
    const { tr, schema } = state;
    let changed = false;

    state.doc.descendants((node, pos) => {
      // Migrate legacy mermaid nodes that have old 'content' attribute to new 'src' attribute
      if (node.type.name === "mermaid" && !node.attrs.src && node.attrs.content) {
        const src = node.attrs.content;
        console.log('[mermaid][transform] src:', src.slice(0, 120), 'pos:', pos);
        const newNode = schema.nodes.mermaid.create({ src });
        tr.replaceWith(pos, pos + node.nodeSize, newNode);
        changed = true;
      }
      // Migrate legacy mermaid nodes that still have textContent (from before atomic conversion)
      else if (node.type.name === "mermaid" && !node.attrs.src && node.textContent.trim()) {
        const src = node.textContent.trim();
        console.log('[mermaid][transform] src:', src.slice(0, 120), 'pos:', pos);
        const newNode = schema.nodes.mermaid.create({ src });
        tr.replaceWith(pos, pos + node.nodeSize, newNode);
        changed = true;
      }
      // Transform codeBlock[language=mermaid] to mermaid nodes
      else if (
        node.type.name === "codeBlock" &&
        node.attrs.language === "mermaid" &&
        schema.nodes.mermaid
      ) {
        const src = node.textContent || '';
        console.log('[mermaid][transform] src:', src.slice(0, 120), 'pos:', pos);
        const newNode = schema.nodes.mermaid.create({ src });
        tr.replaceWith(pos, pos + node.nodeSize, newNode);
        changed = true;
      }
    });
    
    if (changed) {
      view.dispatch(tr);
      console.log('[mermaid][state] JSON:', JSON.stringify(view.state.doc.toJSON()).slice(0, 400));
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction(transactions, oldState, newState) {
          const { tr, doc, schema } = newState;
          let changed = false;

          // Only process if there were actual changes to the document
          if (!transactions.some((transaction) => transaction.docChanged)) {
            return null;
          }
          
          // Scan the document for codeBlock nodes with language="mermaid"
          doc.descendants((node, pos) => {
            if (
              node.type.name === "codeBlock" &&
              node.attrs.language === "mermaid" &&
              schema.nodes.mermaid
            ) {
              // Create new atomic mermaid node with src attribute
              const src = node.textContent || '';
              console.log('[mermaid][transform] src:', src.slice(0, 120), 'pos:', pos);
              const newNode = schema.nodes.mermaid.create({ src });
              tr.replaceWith(pos, pos + node.nodeSize, newNode);
              changed = true;
            }
          });

          return changed ? tr : null;
        },
      }),
    ];
  },
});
