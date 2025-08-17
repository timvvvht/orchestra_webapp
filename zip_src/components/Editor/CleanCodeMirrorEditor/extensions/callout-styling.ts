import { Extension } from '@codemirror/state';
import { ViewPlugin, DecorationSet, Decoration, EditorView, WidgetType, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

// Regex to match callout syntax: > [!TYPE] Title
const CALLOUT_REGEX = /^(\s*>\s*)\[!(\w+)\]\s*(.*)$/;

// Regex to match continuation of blockquote
const BLOCKQUOTE_CONTINUATION_REGEX = /^(\s*>\s*)(.*)$/;

// Types of callouts with their colors
const CALLOUT_TYPES: Record<string, { color: string; icon: string }> = {
  note: { color: 'var(--callout-note, #448aff)', icon: 'ℹ️' },
  info: { color: 'var(--callout-info, #00bcd4)', icon: 'ℹ️' },
  tip: { color: 'var(--callout-tip, #00bfa5)', icon: '💡' },
  hint: { color: 'var(--callout-hint, #00bfa5)', icon: '💡' },
  important: { color: 'var(--callout-important, #00bfa5)', icon: '❗' },
  success: { color: 'var(--callout-success, #4caf50)', icon: '✅' },
  check: { color: 'var(--callout-check, #4caf50)', icon: '✅' },
  done: { color: 'var(--callout-done, #4caf50)', icon: '✅' },
  question: { color: 'var(--callout-question, #2196f3)', icon: '❓' },
  help: { color: 'var(--callout-help, #2196f3)', icon: '❓' },
  faq: { color: 'var(--callout-faq, #2196f3)', icon: '❓' },
  warning: { color: 'var(--callout-warning, #ff9800)', icon: '⚠️' },
  caution: { color: 'var(--callout-caution, #ff9800)', icon: '⚠️' },
  attention: { color: 'var(--callout-attention, #ff9800)', icon: '⚠️' },
  danger: { color: 'var(--callout-danger, #ff5252)', icon: '🔥' },
  error: { color: 'var(--callout-error, #ff5252)', icon: '🔥' },
  bug: { color: 'var(--callout-bug, #ff5252)', icon: '🐛' },
  example: { color: 'var(--callout-example, #7c4dff)', icon: '📝' },
  quote: { color: 'var(--callout-quote, #9e9e9e)', icon: '💬' },
  cite: { color: 'var(--callout-cite, #9e9e9e)', icon: '💬' },
  abstract: { color: 'var(--callout-abstract, #9c27b0)', icon: '📌' },
  summary: { color: 'var(--callout-summary, #9c27b0)', icon: '📌' },
  tldr: { color: 'var(--callout-tldr, #9c27b0)', icon: '📌' },
  todo: { color: 'var(--callout-todo, #2196f3)', icon: '📝' },
};

// Widget for callout title
class CalloutTitleWidget extends WidgetType {
  constructor(
    private readonly type: string,
    private readonly title: string,
    private readonly color: string,
    private readonly icon: string
  ) {
    super();
  }

  eq(other: CalloutTitleWidget) {
    return (
      this.type === other.type &&
      this.title === other.title &&
      this.color === other.color &&
      this.icon === other.icon
    );
  }

  toDOM() {
    const wrapper = document.createElement('span');
    wrapper.className = `cm-callout-title cm-callout-${this.type.toLowerCase()}`;
    wrapper.style.color = this.color;
    wrapper.style.fontWeight = 'bold';
    wrapper.style.display = 'inline-flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.gap = '4px';
    
    const iconSpan = document.createElement('span');
    iconSpan.textContent = this.icon;
    iconSpan.style.fontSize = '1em';
    wrapper.appendChild(iconSpan);
    
    const typeSpan = document.createElement('span');
    typeSpan.textContent = this.type.toUpperCase();
    typeSpan.style.fontSize = '0.85em';
    typeSpan.style.textTransform = 'uppercase';
    wrapper.appendChild(typeSpan);
    
    if (this.title.trim()) {
      const titleSpan = document.createElement('span');
      titleSpan.textContent = `: ${this.title}`;
      titleSpan.style.fontWeight = 'bold';
      wrapper.appendChild(titleSpan);
    }
    
    return wrapper;
  }

  ignoreEvent() {
    return false;
  }
}

// Callout styling plugin
function calloutStylingPlugin() {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      activeCallouts: Map<number, { type: string; color: string; icon: string }> = new Map();

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
        
        // Reset active callouts
        this.activeCallouts = new Map();

        // Process each line in the viewport
        for (let i = 1; i <= doc.lines; i++) {
          const line = doc.line(i);
          const lineText = line.text;
          
          // Check if this line starts a callout
          const calloutMatch = lineText.match(CALLOUT_REGEX);
          if (calloutMatch) {
            const [, prefix, type, title] = calloutMatch;
            const calloutType = type.toLowerCase();
            const calloutInfo = CALLOUT_TYPES[calloutType] || { color: 'var(--text-normal)', icon: 'ℹ️' };
            
            // Store this callout as active
            this.activeCallouts.set(i, {
              type: calloutType,
              color: calloutInfo.color,
              icon: calloutInfo.icon
            });
            
            // Add decoration for the callout title
            const prefixEnd = line.from + prefix.length;
            const titleWidget = new CalloutTitleWidget(
              calloutType,
              title,
              calloutInfo.color,
              calloutInfo.icon
            );
            
            // Replace the [!TYPE] part with our styled widget
            builder.add(
              prefixEnd,
              prefixEnd + type.length + 2, // +2 for the [! and ]
              Decoration.replace({
                widget: titleWidget
              })
            );
            
            // Add a decoration for the entire line to style it as a callout
            builder.add(
              line.from,
              line.to,
              Decoration.line({
                attributes: {
                  class: `cm-callout cm-callout-${calloutType}`,
                  style: `--callout-color: ${calloutInfo.color}`
                }
              })
            );
          } 
          // Check if this line continues a callout
          else {
            const continuationMatch = lineText.match(BLOCKQUOTE_CONTINUATION_REGEX);
            if (continuationMatch) {
              // Check if the previous line was part of a callout
              const activeCallout = this.activeCallouts.get(i - 1);
              if (activeCallout) {
                // This line continues the callout
                this.activeCallouts.set(i, activeCallout);
                
                // Add a decoration for the entire line to style it as part of the callout
                builder.add(
                  line.from,
                  line.to,
                  Decoration.line({
                    attributes: {
                      class: `cm-callout cm-callout-${activeCallout.type} cm-callout-content`,
                      style: `--callout-color: ${activeCallout.color}`
                    }
                  })
                );
              } else {
                // This is a regular blockquote, not part of a callout
                builder.add(
                  line.from,
                  line.to,
                  Decoration.line({
                    attributes: {
                      class: 'cm-blockquote'
                    }
                  })
                );
              }
            }
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

// CSS styles for callouts
export const calloutStyles = EditorView.baseTheme({
  '.cm-callout': {
    position: 'relative',
    borderLeft: '4px solid var(--callout-color, var(--text-accent))',
    backgroundColor: 'color-mix(in srgb, var(--callout-color, var(--text-accent)) 10%, var(--background-primary))',
    borderRadius: '0 4px 4px 0',
    padding: '0 8px',
    marginLeft: '0',
  },
  
  '.cm-callout-content': {
    paddingTop: '2px',
    paddingBottom: '2px',
  },
  
  '.cm-blockquote': {
    borderLeft: '4px solid var(--background-modifier-border)',
    paddingLeft: '8px',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
  },
});

/**
 * Creates extensions for callout styling
 */
export function createCalloutStylingExtension(): Extension[] {
  return [
    calloutStylingPlugin(),
    calloutStyles,
  ];
}