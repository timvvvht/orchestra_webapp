import { Extension } from '@codemirror/state';
import { ViewPlugin, DecorationSet, Decoration, EditorView, WidgetType, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

// Regex to match wiki links: [[Page]] or [[Page|Display Text]]
const WIKI_LINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

// Widget for wiki links
class WikiLinkWidget extends WidgetType {
  constructor(
    private readonly target: string,
    private readonly displayText: string,
    private readonly exists: boolean = true
  ) {
    super();
  }

  eq(other: WikiLinkWidget) {
    return (
      this.target === other.target &&
      this.displayText === other.displayText &&
      this.exists === other.exists
    );
  }

  toDOM() {
    const wrapper = document.createElement('span');
    wrapper.className = `cm-wiki-link ${
      this.exists ? 'cm-wiki-link-exists' : 'cm-wiki-link-broken'
    }`;
    wrapper.textContent = this.displayText;
    wrapper.setAttribute('data-target', this.target);
    wrapper.style.cursor = 'pointer';
    
    // Add click handler to navigate to the linked page
    wrapper.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Dispatch a custom event that can be caught by the editor component
      const event = new CustomEvent('wiki-link-click', {
        bubbles: true,
        detail: { target: this.target }
      });
      wrapper.dispatchEvent(event);
    });
    
    return wrapper;
  }

  ignoreEvent() {
    return false;
  }
}

// Wiki link styling plugin
function wikiLinkStylingPlugin() {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = this.buildDecorations(update.view);
        }
      }

      buildDecorations(view: EditorView) {
        const builder = new RangeSetBuilder<Decoration>();
        const { state } = view;
        const { doc } = state;
        
        // Process each line in the viewport
        for (let i = 1; i <= doc.lines; i++) {
          const line = doc.line(i);
          const lineText = line.text;
          
          // Find all wiki links in the line
          const matches = Array.from(lineText.matchAll(WIKI_LINK_REGEX));
          
          for (const match of matches) {
            if (match.index === undefined) continue;
            
            const [fullMatch, target, displayText] = match;
            const start = line.from + match.index;
            const end = start + fullMatch.length;
            
            // Create a widget for the wiki link
            const widget = new WikiLinkWidget(
              target,
              displayText || target,
              true // We'll assume the link exists for now
            );
            
            // Replace the wiki link with our styled widget
            builder.add(
              start,
              end,
              Decoration.replace({
                widget
              })
            );
          }
        }

        return builder.finish();
      }
    },
    {
      decorations: (v) => v.decorations,
    }
  );
}

// CSS styles for wiki links
export const wikiLinkStyles = EditorView.baseTheme({
  '.cm-wiki-link': {
    color: 'var(--text-accent, #5e81ac)',
    textDecoration: 'underline',
    textDecorationStyle: 'solid',
    textDecorationColor: 'var(--text-accent, #5e81ac)',
    textDecorationThickness: '1px',
    textUnderlineOffset: '2px',
    borderRadius: '2px',
    padding: '0 2px',
    transition: 'background-color 0.2s ease, color 0.2s ease',
  },
  '.cm-wiki-link:hover': {
    backgroundColor: 'var(--text-accent-hover-bg, rgba(94, 129, 172, 0.1))',
    color: 'var(--text-accent-hover, #81a1c1)',
    textDecorationColor: 'var(--text-accent-hover, #81a1c1)',
  },
  '.cm-wiki-link-broken': {
    color: 'var(--text-error, #bf616a)',
    textDecorationColor: 'var(--text-error, #bf616a)',
    textDecorationStyle: 'dashed',
  },
  '.cm-wiki-link-broken:hover': {
    backgroundColor: 'var(--text-error-hover-bg, rgba(191, 97, 106, 0.1))',
    color: 'var(--text-error-hover, #d08770)',
    textDecorationColor: 'var(--text-error-hover, #d08770)',
  },
});

/**
 * Creates extensions for wiki link styling
 */
export function createWikiLinkStylingExtension(): Extension[] {
  return [
    wikiLinkStylingPlugin(),
    wikiLinkStyles,
  ];
}