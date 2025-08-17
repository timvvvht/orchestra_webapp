import { Node, mergeAttributes, InputRule, PasteRule } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { MermaidView } from './MermaidView';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mermaid: {
      /**
       * Set a Mermaid diagram.
       */
      setMermaid: (diagramCode: string) => ReturnType;
      /**
       * Update Mermaid theme.
       */
      updateMermaidTheme: (isDark: boolean) => ReturnType;
    };
  }
}

export const MermaidExtension = Node.create({
  name: 'mermaid',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      diagramCode: {
        default: '',
        parseHTML: element => element.getAttribute('data-code') || '',
        renderHTML: attributes => ({
          'data-code': attributes.diagramCode,
        }),
      },
      theme: {
        default: 'default',
        parseHTML: element => element.getAttribute('data-theme') || 'default',
        renderHTML: attributes => ({
          'data-theme': attributes.theme,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'pre[data-type="mermaid"]',
        getAttrs: element => {
          const code = (element as HTMLElement).getAttribute('data-code');
          const theme = (element as HTMLElement).getAttribute('data-theme');
          return {
            diagramCode: code || '',
            theme: theme || 'default',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'pre',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'mermaid',
        'data-code': HTMLAttributes.diagramCode,
        'data-theme': HTMLAttributes.theme,
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidView);
  },

  addCommands() {
    return {
      setMermaid: (diagramCode: string) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: { diagramCode },
        });
      },
      updateMermaidTheme: (isDark: boolean) => ({ tr, state }) => {
        const { doc } = state;
        let updated = false;

        doc.descendants((node, pos) => {
          if (node.type.name === this.name) {
            const newTheme = isDark ? 'dark' : 'default';
            if (node.attrs.theme !== newTheme) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                theme: newTheme,
              });
              updated = true;
            }
          }
        });

        return updated;
      },
    };
  },

  addInputRules() {
    return [
      new InputRule({
        find: /:::mermaid\n([\s\S]+?)\n:::/,
        handler: ({ state, range, match }) => {
          const [, diagramCode] = match;
          const { tr } = state;
          
          tr.replaceWith(range.from, range.to, this.type.create({
            diagramCode: diagramCode.trim(),
          }));
        },
      }),
    ];
  },

  addPasteRules() {
    return [
      new PasteRule({
        find: /```mermaid\n([\s\S]+?)\n```/g,
        handler: ({ state, range, match }) => {
          const [, diagramCode] = match;
          const { tr } = state;
          
          tr.replaceWith(range.from, range.to, this.type.create({
            diagramCode: diagramCode.trim(),
          }));
        },
      }),
      new PasteRule({
        find: /(graph|sequenceDiagram|gantt|classDiagram|stateDiagram|journey|gitgraph|pie|flowchart|erDiagram|mindmap|timeline|sankey|block|architecture)\s+[\s\S]+/g,
        handler: ({ state, range, match }) => {
          const diagramCode = match[0];
          const { tr } = state;
          
          // Basic validation - check if it looks like valid Mermaid syntax
          if (diagramCode.length > 10 && diagramCode.includes('\n')) {
            tr.replaceWith(range.from, range.to, this.type.create({
              diagramCode: diagramCode.trim(),
            }));
          }
        },
      }),
    ];
  },
});

export default MermaidExtension;