import { Node } from '@tiptap/core';
import mermaid from 'mermaid';

export interface MermaidOptions {
    HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        mermaid: {
            /**
             * Insert a mermaid diagram
             */
            setMermaid: (options: { src: string }) => ReturnType;
        };
    }
}

export const MermaidExtension = Node.create<MermaidOptions>({
    name: 'mermaid',

    group: 'block',

    content: '',

    atom: true,

    defining: true,

    isolating: true,

    addAttributes() {
        return {
            src: {
                default: ''
            }
        };
    },

    addOptions() {
        return {
            HTMLAttributes: {}
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="mermaid"]',
                getAttrs: element => {
                    const src = element.getAttribute('data-src') || '';
                    console.log('[mermaid][parseHTML] data-src:', src.slice(0, 120));
                    return { src };
                }
            }
        ];
    },

    renderHTML({ HTMLAttributes, node }) {
        const src = node?.attrs?.src || '';
        console.log('[mermaid][renderHTML] src:', src.slice(0, 120));
        return [
            'div',
            {
                ...HTMLAttributes,
                'data-type': 'mermaid',
                class: 'mermaid',
                'data-src': src
            }
        ];
    },

    addNodeView() {
        return ({ node }) => {
            const src = node.attrs.src || '';
            console.log('[mermaid][nodeview] src attr:', src.slice(0, 120));

            const container = document.createElement('div');
            container.className = 'mermaid-container';
            container.setAttribute('data-type', 'mermaid');

            const mermaidDiv = document.createElement('div');
            mermaidDiv.className = 'mermaid';
            mermaidDiv.setAttribute('data-type', 'mermaid');
            mermaidDiv.setAttribute('data-src', src);

            // Initialize mermaid if not already done
            if (!mermaid.mermaidAPI) {
                mermaid.initialize({
                    startOnLoad: false,
                    theme: 'dark',
                    securityLevel: 'loose'
                });
            }

            // Render the mermaid diagram
            const renderMermaid = async () => {
                try {
                    if (src.trim()) {
                        console.log('[mermaid][render] src length:', src.length);
                        // Generate a unique ID for this diagram
                        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

                        // Parse and render the mermaid syntax
                        await mermaid.parse(src);
                        const { svg } = await mermaid.render(id, src);
                        console.log('[mermaid][render] svg length:', svg.length);
                        mermaidDiv.innerHTML = svg;
                    } else {
                        mermaidDiv.innerHTML = '<div class="mermaid-placeholder">Enter mermaid syntax...</div>';
                    }
                } catch (error) {
                    console.error('[mermaid] ❌ Mermaid rendering error:', error);
                    mermaidDiv.innerHTML = `<pre><code>${src}</code></pre>`;
                }
            };

            // Initial render
            renderMermaid();

            container.appendChild(mermaidDiv);

            return {
                dom: container,
                update: () => false // No updates - atomic node
            };
        };
    },

    addCommands() {
        return {
            setMermaid:
                options =>
                ({ commands }) => {
                    console.log('[mermaid][setMermaid] src:', options.src.slice(0, 120));
                    return commands.insertContent({
                        type: this.name,
                        attrs: {
                            src: options.src
                        }
                    });
                }
        };
    }
});

export default MermaidExtension;
