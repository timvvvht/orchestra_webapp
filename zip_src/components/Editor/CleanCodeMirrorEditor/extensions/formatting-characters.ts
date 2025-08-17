import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

// Regular expressions for different types of markdown formatting
const FORMATTING_PATTERNS = {
  // Bold: **text** or __text__
  bold: /\*\*(.*?)\*\*|__(.*?)__/g,
  // Italic: *text* or _text_
  italic: /(?<!\*)\*(?!\*)(.*?)\*(?!\*)|(?<!_)_(?!_)(.*?)_(?!_)/g,
  // Strikethrough: ~~text~~
  strikethrough: /~~(.*?)~~/g,
  // Inline code: `code`
  inlineCode: /`(.*?)`/g,
  // Links: [text](url)
  link: /\[(.*?)\]\((.*?)\)/g,
  // Images: ![alt](url)
  image: /!\[(.*?)\]\((.*?)\)/g,
  // Lists: - item or 1. item
  list: /^(\s*)([-+*]|\d+\.)\s/gm,
};

// Create decorations for different formatting types
const createFormatDecoration = (type: string) => Decoration.mark({
  class: `cm-formatting-hidden cm-formatting-${type}`,
  attributes: { 'data-formatting-type': type }
});

// Decorations for different formatting types
const decorations = {
  bold: createFormatDecoration('bold'),
  italic: createFormatDecoration('italic'),
  strikethrough: createFormatDecoration('strikethrough'),
  inlineCode: createFormatDecoration('code'),
  link: createFormatDecoration('link'),
  image: createFormatDecoration('image'),
  list: createFormatDecoration('list'),
};

// Helper function to find all matches for a regex pattern in a text
function findAllMatches(text: string, pattern: RegExp, lineOffset: number): { from: number, to: number, type: string }[] {
  const matches: { from: number, to: number, type: string }[] = [];
  let match;
  
  // Reset the regex to start from the beginning
  pattern.lastIndex = 0;
  
  while ((match = pattern.exec(text)) !== null) {
    // Determine the type based on the pattern
    let type = 'unknown';
    for (const [key, regex] of Object.entries(FORMATTING_PATTERNS)) {
      if (regex.source === pattern.source) {
        type = key;
        break;
      }
    }
    
    // For bold: capture the ** or __ markers
    if (type === 'bold') {
      // Opening marker
      matches.push({
        from: lineOffset + match.index,
        to: lineOffset + match.index + 2, // ** or __ is 2 chars
        type
      });
      
      // Closing marker
      matches.push({
        from: lineOffset + match.index + match[0].length - 2,
        to: lineOffset + match.index + match[0].length,
        type
      });
    }
    // For italic: capture the * or _ markers
    else if (type === 'italic') {
      // Opening marker
      matches.push({
        from: lineOffset + match.index,
        to: lineOffset + match.index + 1, // * or _ is 1 char
        type
      });
      
      // Closing marker
      matches.push({
        from: lineOffset + match.index + match[0].length - 1,
        to: lineOffset + match.index + match[0].length,
        type
      });
    }
    // For strikethrough: capture the ~~ markers
    else if (type === 'strikethrough') {
      // Opening marker
      matches.push({
        from: lineOffset + match.index,
        to: lineOffset + match.index + 2, // ~~ is 2 chars
        type
      });
      
      // Closing marker
      matches.push({
        from: lineOffset + match.index + match[0].length - 2,
        to: lineOffset + match.index + match[0].length,
        type
      });
    }
    // For inline code: capture the ` markers
    else if (type === 'inlineCode') {
      // Opening marker
      matches.push({
        from: lineOffset + match.index,
        to: lineOffset + match.index + 1, // ` is 1 char
        type
      });
      
      // Closing marker
      matches.push({
        from: lineOffset + match.index + match[0].length - 1,
        to: lineOffset + match.index + match[0].length,
        type
      });
    }
    // For links: capture the [], () markers
    else if (type === 'link') {
      // [text] part
      matches.push({
        from: lineOffset + match.index,
        to: lineOffset + match.index + 1, // [ is 1 char
        type
      });
      
      // Find the closing ] position
      const closingBracketPos = match[0].indexOf('](');
      if (closingBracketPos > 0) {
        matches.push({
          from: lineOffset + match.index + closingBracketPos,
          to: lineOffset + match.index + closingBracketPos + 1, // ] is 1 char
          type
        });
        
        // ( marker
        matches.push({
          from: lineOffset + match.index + closingBracketPos + 1,
          to: lineOffset + match.index + closingBracketPos + 2, // ( is 1 char
          type
        });
        
        // ) marker
        matches.push({
          from: lineOffset + match.index + match[0].length - 1,
          to: lineOffset + match.index + match[0].length, // ) is 1 char
          type
        });
      }
    }
    // For images: capture the ![], () markers
    else if (type === 'image') {
      // ![text] part
      matches.push({
        from: lineOffset + match.index,
        to: lineOffset + match.index + 2, // ![ is 2 chars
        type
      });
      
      // Find the closing ] position
      const closingBracketPos = match[0].indexOf('](');
      if (closingBracketPos > 0) {
        matches.push({
          from: lineOffset + match.index + closingBracketPos,
          to: lineOffset + match.index + closingBracketPos + 1, // ] is 1 char
          type
        });
        
        // ( marker
        matches.push({
          from: lineOffset + match.index + closingBracketPos + 1,
          to: lineOffset + match.index + closingBracketPos + 2, // ( is 1 char
          type
        });
        
        // ) marker
        matches.push({
          from: lineOffset + match.index + match[0].length - 1,
          to: lineOffset + match.index + match[0].length, // ) is 1 char
          type
        });
      }
    }
    // For lists: capture the marker at the beginning of the line
    else if (type === 'list') {
      const markerLength = match[2].length;
      matches.push({
        from: lineOffset + match.index + match[1].length,
        to: lineOffset + match.index + match[1].length + markerLength,
        type
      });
    }
  }
  
  return matches;
}

// Create a view plugin that adds decorations to formatting characters
export const formattingCharactersPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    buildDecorations(view: EditorView) {
      const builder = new RangeSetBuilder<Decoration>();
      const activeLine = view.state.selection.main.head;
      const activeLineInfo = view.state.doc.lineAt(activeLine);

      // Collect all decorations first, then sort and add them
      const allDecorations: {from: number, to: number, decoration: Decoration}[] = [];

      // Process visible lines
      for (let { from, to } of view.visibleRanges) {
        let pos = from;
        while (pos <= to) {
          const line = view.state.doc.lineAt(pos);
          const lineText = line.text;
          
          // Skip processing if this is the active line
          // EXCEPT for list formatting which should always be visible
          const isList = lineText.match(/^\s*[-+*]\s|^\s*\d+\.\s/);
          if (line.number === activeLineInfo.number && !isList) {
            pos = line.to + 1;
            continue;
          }
          
          // Find all formatting characters in this line
          for (const [type, pattern] of Object.entries(FORMATTING_PATTERNS)) {
            // Skip list pattern on active line since we want to handle it separately
            if (type === 'list' && line.number === activeLineInfo.number) {
              continue;
            }
            
            const matches = findAllMatches(lineText, pattern, line.from);
            
            for (const match of matches) {
              // Skip hiding list markers regardless of active line
              if (match.type === 'list') {
                continue;
              }
              
              // Collect decoration for this formatting character
              allDecorations.push({
                from: match.from,
                to: match.to,
                decoration: decorations[match.type as keyof typeof decorations] || decorations.bold
              });
            }
          }
          
          pos = line.to + 1;
        }
      }

      // Sort decorations by from position
      allDecorations.sort((a, b) => {
        // First sort by from position
        const fromDiff = a.from - b.from;
        if (fromDiff !== 0) return fromDiff;
        
        // If from positions are equal, line decorations should come before mark decorations
        const aIsLine = a.decoration.spec.type === "line";
        const bIsLine = b.decoration.spec.type === "line";
        if (aIsLine !== bIsLine) return aIsLine ? -1 : 1;
        
        // If both are the same type, sort by to position
        return a.to - b.to;
      });

      // Add decorations in sorted order
      for (const { from, to, decoration } of allDecorations) {
        builder.add(from, to, decoration);
      }

      return builder.finish();
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

// CSS styles for formatting character decorations
export const formattingCharactersStyles = EditorView.baseTheme({
  // Hide formatting characters by default
  '.cm-formatting-hidden': {
    color: 'transparent !important',
    background: 'none !important',
  },
  // Specific styling for different types of formatting
  '.cm-formatting-bold': {
    fontSize: '0.75em !important',
  },
  '.cm-formatting-italic': {
    fontSize: '0.75em !important',
  },
  '.cm-formatting-strikethrough': {
    fontSize: '0.75em !important',
  },
  '.cm-formatting-code': {
    fontSize: '0.75em !important',
  },
  '.cm-formatting-link': {
    fontSize: '0.75em !important',
  },
  '.cm-formatting-image': {
    fontSize: '0.75em !important',
  },
  // List formatting should always be visible
  '.cm-formatting-list': {
    fontSize: '0.9em !important',
    color: 'var(--text-muted) !important',
    display: 'inline !important',
  },
});

// Create a comprehensive formatting characters extension
export function createFormattingCharactersExtension() {
  return [
    formattingCharactersPlugin,
    formattingCharactersStyles,
  ];
}