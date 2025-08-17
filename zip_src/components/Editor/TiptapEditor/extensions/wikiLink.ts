import { Mark, mergeAttributes, InputRule } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export interface WikiLinkOptions {
  HTMLAttributes: Record<string, any>;
  validate?: (id: string) => boolean;
  onNavigate?: (id: string) => void;
  renderHTML?: (options: { mark: any; HTMLAttributes: Record<string, any> }) => any;
  parseHTML?: (element: HTMLElement) => any;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    wikiLink: {
      /**
       * Set a wiki link
       */
      setWikiLink: (attributes: { id: string }) => ReturnType;
      /**
       * Toggle a wiki link
       */
      toggleWikiLink: (attributes: { id: string }) => ReturnType;
      /**
       * Unset a wiki link
       */
      unsetWikiLink: () => ReturnType;
    };
  }
}

export const WikiLinkExtension = Mark.create<WikiLinkOptions>({
  name: 'wikiLink',

  addOptions(): WikiLinkOptions {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => {
          const id = element.getAttribute('data-wiki-id');
          return id;
        },
        renderHTML: attributes => {
          if (!attributes.id) {
            return {};
          }

          return {
            'data-wiki-id': attributes.id,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'a[data-wiki-id]',
        getAttrs: element => {
          const id = (element as HTMLElement).getAttribute('data-wiki-id');
          return id ? { id } : false;
        },
      },
    ];
  },

  renderHTML({ mark, HTMLAttributes }) {
    const { id } = mark.attrs;

    if (this.options.renderHTML) {
      return this.options.renderHTML({ mark, HTMLAttributes });
    }

    return [
      'a',
      mergeAttributes(
        this.options.HTMLAttributes,
        HTMLAttributes,
        {
          'data-wiki-id': id,
          class: 'wikilink',
          href: `#${id}`, // Default href, can be overridden
        }
      ),
      0, // Content slot
    ];
  },

  addCommands() {
    return {
      setWikiLink: attributes => ({ commands }) => {
        if (!attributes.id) {
          return false;
        }

        // Validate the ID if a validator is provided
        if (this.options.validate && !this.options.validate(attributes.id)) {
          return false;
        }

        return commands.setMark(this.name, attributes);
      },

      toggleWikiLink: attributes => ({ commands }) => {
        if (!attributes.id) {
          return false;
        }

        // Validate the ID if a validator is provided
        if (this.options.validate && !this.options.validate(attributes.id)) {
          return false;
        }

        return commands.toggleMark(this.name, attributes);
      },

      unsetWikiLink: () => ({ commands }) => {
        return commands.unsetMark(this.name);
      },
    };
  },

  addInputRules() {
    return [
      new InputRule({
        find: /\[\[([^\]]+)\]\]/g,
        handler: ({ range, match, commands }) => {
          const linkText = match[1];

          if (!linkText) return;

          // Validate the link if a validator is provided
          if (this.options.validate && !this.options.validate(linkText)) {
            return;
          }

          // Replace the [[text]] with a wiki link
          commands.deleteRange(range);
          commands.insertContent(linkText);
          commands.setMark(this.name, { id: linkText });
        },
      }),
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('wikiLinkHandler'),
        props: {
          handleClick: (view, pos, event) => {
            const { target } = event;
            
            if (!(target instanceof HTMLElement)) {
              return false;
            }

            const wikiLink = target.closest('a[data-wiki-id]') as HTMLAnchorElement;
            
            if (!wikiLink) {
              return false;
            }

            const id = wikiLink.getAttribute('data-wiki-id');
            
            if (!id) {
              return false;
            }

            // Prevent default link behavior
            event.preventDefault();

            // Call the navigation handler if provided
            if (this.options.onNavigate) {
              this.options.onNavigate(id);
            } else {
              console.log('WikiLink clicked:', id);
            }

            return true;
          },
        },
      }),
    ];
  },
});

// Workspace path resolver stub
export class WikiLinkResolver {
  private currentFilePath: string | null = null;
  private navigationHandler: ((path: string) => void) | null = null;

  setCurrentFilePath(path: string | null) {
    this.currentFilePath = path;
  }

  onNavigate(handler: (path: string) => void) {
    this.navigationHandler = handler;
  }

  navigateToLink(linkId: string) {
    console.log('Navigating to wiki link:', linkId);
    
    // Placeholder implementation - in a real app, this would:
    // 1. Resolve the link ID to a file path
    // 2. Check if the file exists
    // 3. Navigate to the file or create it if it doesn't exist
    
    const resolvedPath = this.resolveLinkToPath(linkId);
    
    if (this.navigationHandler) {
      this.navigationHandler(resolvedPath);
    } else {
      console.log('No navigation handler set for wiki link:', linkId);
    }
  }

  private resolveLinkToPath(linkId: string): string {
    // Placeholder implementation
    // In a real app, this would use workspace configuration
    // to resolve wiki links to actual file paths
    
    // Simple implementation: convert spaces to dashes and add .md extension
    const fileName = linkId.toLowerCase().replace(/\s+/g, '-') + '.md';
    
    // If we have a current file path, resolve relative to its directory
    if (this.currentFilePath) {
      const currentDir = this.currentFilePath.split('/').slice(0, -1).join('/');
      return currentDir ? `${currentDir}/${fileName}` : fileName;
    }
    
    return fileName;
  }

  // Check if a wiki link exists (placeholder)
  linkExists(linkId: string): boolean {
    // Placeholder implementation
    // In a real app, this would check if the resolved file exists
    console.log('Checking if wiki link exists:', linkId);
    return true; // For now, assume all links exist
  }
}

// Global wiki link resolver instance
export const wikiLinkResolver = new WikiLinkResolver();

export default WikiLinkExtension;