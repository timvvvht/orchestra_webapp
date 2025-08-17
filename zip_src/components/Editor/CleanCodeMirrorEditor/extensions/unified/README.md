# Unified Formatting System for CodeMirror 6

This directory contains a comprehensive formatting system for Markdown editing in CodeMirror 6. The system provides a clean reading view with hidden formatting characters and an informative editing view when the cursor is on a line.

## Architecture

The unified formatting system is built around a central ViewPlugin that detects and decorates various Markdown formatting elements. The system consists of the following components:

### Core Components

1. **FormattingType Enum**: Defines all supported formatting types (headers, inline formatting, code blocks, etc.)
2. **FormattingRange Interface**: Represents a range of text with formatting information
3. **ViewPlugin**: Detects formatting elements and applies decorations
4. **Base Theme**: Provides consistent styling for all formatting elements

### Detection Methods

The system includes methods for detecting various formatting elements:

- Headers (# to ######)
- Code fences (```)
- List markers (-, *, +, 1., etc.)
- Task markers ([ ], [x])
- Inline formatting (bold, italic, strikethrough, inline code)
- Links and images
- Blockquotes
- Horizontal rules

### Decoration Methods

For each formatting type, there's a corresponding method to create the appropriate decoration:

- Header hash decorations
- Header text decorations
- Bold marker decorations
- Italic marker decorations
- Code fence decorations
- List marker decorations
- etc.

### Widgets

The system includes widgets for enhanced functionality:

- **LanguageIndicatorWidget**: Displays the language of a code block
- **CopyButtonWidget**: Provides a button to copy code block content

## Usage

To use the unified formatting system, import the `createUnifiedFormattingSystem` function and add it to your editor extensions:

```typescript
import { createUnifiedFormattingSystem } from './extensions/unified';

// In your editor setup
const extensions = [
  // Other extensions...
  ...createUnifiedFormattingSystem(),
];
```

## Customization

### Adding New Formatting Types

To add a new formatting type:

1. Add a new entry to the `FormattingType` enum
2. Create a detection method for the new type
3. Create a decoration method for the new type
4. Add styling for the new type to the base theme

Example:

```typescript
// 1. Add to FormattingType enum
enum FormattingType {
  // Existing types...
  CUSTOM_TYPE,
}

// 2. Create detection method
detectCustomType(line: any, ranges: FormattingRange[], isActiveLine: boolean) {
  // Detection logic...
  ranges.push({
    from: start,
    to: end,
    type: FormattingType.CUSTOM_TYPE,
    isActive: isActiveLine
  });
}

// 3. Create decoration method
createCustomTypeDecoration(range: FormattingRange, isActiveLine: boolean): Decoration | null {
  return Decoration.mark({
    class: 'cm-formatting cm-formatting-custom',
    attributes: { 'data-formatting-type': 'custom' }
  });
}

// 4. Add to base theme
const unifiedFormattingTheme = EditorView.baseTheme({
  // Existing styles...
  '.cm-formatting-custom': {
    // Custom styling...
  },
});
```

### Customizing Styling

The base theme uses CSS variables for colors and other properties, making it easy to customize the appearance without modifying the code. You can override these variables in your own CSS:

```css
:root {
  --text-heading-h1: #ff0000; /* Red H1 headers */
  --code-background: #f0f0f0; /* Light gray code background */
  --font-monospace: 'Fira Code', monospace; /* Custom monospace font */
}
```

## Performance Considerations

The unified formatting system is designed to be efficient, but there are some things to keep in mind:

1. **Viewport Processing**: The system only processes lines that are currently visible in the viewport, improving performance for large documents.
2. **Active Line Detection**: Formatting characters are only shown on the active line, reducing the number of visible elements.
3. **Batched Updates**: Decorations are built in batches and sorted before being applied to the editor.

## Future Improvements

- Add support for more Markdown extensions (tables, footnotes, etc.)
- Improve performance for very large documents
- Add more customization options
- Support for custom widgets and interactive elements