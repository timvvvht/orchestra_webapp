import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import MermaidComponent from '../ui/MermaidComponent';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mermaid: {
      /**
       * Insert a Mermaid diagram with the given code
       */
      setMermaid: (code: string) => ReturnType;
      /**
       * Update the current Mermaid diagram's code
       */
      updateMermaid: (code: string) => ReturnType;
    };
  }
}

export interface MermaidOptions {
  HTMLAttributes: Record<string, unknown>;
}

export const Mermaid = Node.create<MermaidOptions>({
  name: 'mermaid',
  group: 'block',
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      code: {
        default: 'graph TD\n    A[Start] --> B{Is it?}\n    B -->|Yes| C[OK]\n    C --> D[Rethink]\n    D --> B\n    B -->|No| E[End]',
        parseHTML: element => element.getAttribute('data-mermaid-code'),
        renderHTML: attributes => {
          if (!attributes.code) {
            return {};
          }
          return {
            'data-mermaid-code': attributes.code,
          };
        },
      },
      mode: {
        default: 'preview',
        parseHTML: element => element.getAttribute('data-mode') || 'preview',
        renderHTML: attributes => {
          return {
            'data-mode': attributes.mode,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="mermaid"]',
        getAttrs: element => {
          const code = (element as HTMLElement).getAttribute('data-mermaid-code');
          const mode = (element as HTMLElement).getAttribute('data-mode') || 'preview';
          return { code, mode };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      {
        'data-type': 'mermaid',
        ...HTMLAttributes,
      },
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidComponent);
  },

  addCommands() {
    return {
      setMermaid:
        (code: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { code, mode: 'preview' },
          });
        },
      updateMermaid:
        (code: string) =>
        ({ tr, state }) => {
          const { selection } = state;
          const node = state.doc.nodeAt(selection.from);
          
          if (node && node.type.name === this.name) {
            tr.setNodeMarkup(selection.from, undefined, {
              ...node.attrs,
              code,
            });
            return true;
          }
          
          return false;
        },
    };
  },
});

export default Mermaid;